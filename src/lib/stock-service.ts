import prisma from './prisma';

export async function ensureVirtualLocations(tx: any) {
  let locVend = await tx.location.findFirst({ where: { code: 'LOC-VEND' } });
  if (!locVend) {
    locVend = await tx.location.create({
      data: {
        name: 'Vendors / External Suppliers',
        code: 'LOC-VEND',
        isVirtual: true,
        type: 'supplier',
      },
    });
  }

  let locCust = await tx.location.findFirst({ where: { code: 'LOC-CUST' } });
  if (!locCust) {
    locCust = await tx.location.create({
      data: {
        name: 'Customers / External Deliveries',
        code: 'LOC-CUST',
        isVirtual: true,
        type: 'customer',
      },
    });
  }

  let locAdj = await tx.location.findFirst({ where: { code: 'LOC-ADJ' } });
  if (!locAdj) {
    locAdj = await tx.location.create({
      data: {
        name: 'Inventory Adjustments & Variance',
        code: 'LOC-ADJ',
        isVirtual: true,
        type: 'adjustment',
      },
    });
  }

  return { locVend, locCust, locAdj };
}

export async function validateDocument(documentId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch document with all line items and product info
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      include: {
        items: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });

    if (!doc) {
      throw new Error('Document not found.');
    }

    if (doc.status === 'done') {
      throw new Error('Document is already validated and completed.');
    }

    if (doc.status === 'cancelled') {
      throw new Error('Cancelled documents cannot be validated.');
    }

    if (!doc.items || doc.items.length === 0) {
      throw new Error('Document has no product items to process.');
    }

    const { locVend, locCust, locAdj } = await ensureVirtualLocations(tx);
    const createdMoves = [];

    // Process items according to document type
    for (const item of doc.items) {
      const { product } = item;

      if (doc.type === 'receipt') {
        const destLocId = item.toLocationId;
        if (!destLocId) {
          throw new Error(`Receipt item for ${product.name} has no destination location specified.`);
        }
        if (item.quantity <= 0) {
          throw new Error(`Receipt quantity must be greater than zero for ${product.name}.`);
        }

        // Increase stock at destination location
        const existingStock = await tx.stockQuantity.findUnique({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: destLocId,
            },
          },
        });

        const newQty = (existingStock?.quantity || 0) + item.quantity;

        await tx.stockQuantity.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: destLocId,
            },
          },
          update: { quantity: newQty },
          create: {
            productId: product.id,
            locationId: destLocId,
            quantity: newQty,
          },
        });

        // Compute total product stock across internal locations
        const allInternalStock = await tx.stockQuantity.findMany({
          where: {
            productId: product.id,
            location: { isVirtual: false },
          },
        });
        const totalBalanceAfter = allInternalStock.reduce((s: number, q: any) => s + q.quantity, 0);

        // Append immutable StockMove
        const move = await tx.stockMove.create({
          data: {
            documentId: doc.id,
            productId: product.id,
            fromLocationId: locVend.id,
            toLocationId: destLocId,
            quantity: item.quantity,
            balanceAfter: totalBalanceAfter,
            transactionType: 'receipt',
            referenceNumber: doc.documentNumber,
            userId,
            reason: doc.notes || `Goods Receipt against ${doc.documentNumber}`,
          },
        });
        createdMoves.push(move);
      } else if (doc.type === 'delivery') {
        const srcLocId = item.fromLocationId;
        if (!srcLocId) {
          throw new Error(`Delivery item for ${product.name} has no source location specified.`);
        }
        if (item.quantity <= 0) {
          throw new Error(`Delivery quantity must be greater than zero for ${product.name}.`);
        }

        // Check source stock
        const sourceStock = await tx.stockQuantity.findUnique({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: srcLocId,
            },
          },
        });

        const available = sourceStock?.quantity || 0;
        if (available < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available quantity: ${available}. Requested delivery: ${item.quantity}.`
          );
        }

        const newQty = available - item.quantity;
        await tx.stockQuantity.update({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: srcLocId,
            },
          },
          data: { quantity: newQty },
        });

        const allInternalStock = await tx.stockQuantity.findMany({
          where: {
            productId: product.id,
            location: { isVirtual: false },
          },
        });
        const totalBalanceAfter = allInternalStock.reduce((s: number, q: any) => s + q.quantity, 0);

        // Append immutable StockMove
        const move = await tx.stockMove.create({
          data: {
            documentId: doc.id,
            productId: product.id,
            fromLocationId: srcLocId,
            toLocationId: locCust.id,
            quantity: item.quantity,
            balanceAfter: totalBalanceAfter,
            transactionType: 'delivery',
            referenceNumber: doc.documentNumber,
            userId,
            reason: doc.notes || `Delivery to ${doc.partnerName || 'Customer'}`,
          },
        });
        createdMoves.push(move);
      } else if (doc.type === 'internal') {
        const srcLocId = item.fromLocationId;
        const destLocId = item.toLocationId;

        if (!srcLocId || !destLocId) {
          throw new Error(`Transfer item for ${product.name} requires both source and destination locations.`);
        }
        if (srcLocId === destLocId) {
          throw new Error(`Source and destination locations cannot be the same for ${product.name}.`);
        }
        if (item.quantity <= 0) {
          throw new Error(`Transfer quantity must be greater than zero for ${product.name}.`);
        }

        // Check source stock
        const sourceStock = await tx.stockQuantity.findUnique({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: srcLocId,
            },
          },
        });

        const available = sourceStock?.quantity || 0;
        if (available < item.quantity) {
          throw new Error(
            `Transfer quantity exceeds available stock for "${product.name}". Available quantity: ${available}. Requested: ${item.quantity}.`
          );
        }

        // Decrement source
        await tx.stockQuantity.update({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: srcLocId,
            },
          },
          data: { quantity: available - item.quantity },
        });

        // Increment destination
        const destStock = await tx.stockQuantity.findUnique({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: destLocId,
            },
          },
        });

        const newDestQty = (destStock?.quantity || 0) + item.quantity;
        await tx.stockQuantity.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: destLocId,
            },
          },
          update: { quantity: newDestQty },
          create: {
            productId: product.id,
            locationId: destLocId,
            quantity: newDestQty,
          },
        });

        const allInternalStock = await tx.stockQuantity.findMany({
          where: {
            productId: product.id,
            location: { isVirtual: false },
          },
        });
        const totalBalanceAfter = allInternalStock.reduce((s: number, q: any) => s + q.quantity, 0);

        // Append immutable StockMove
        const move = await tx.stockMove.create({
          data: {
            documentId: doc.id,
            productId: product.id,
            fromLocationId: srcLocId,
            toLocationId: destLocId,
            quantity: item.quantity,
            balanceAfter: totalBalanceAfter,
            transactionType: 'internal',
            referenceNumber: doc.documentNumber,
            userId,
            reason: doc.notes || `Internal transfer from ${item.fromLocation?.name} to ${item.toLocation?.name}`,
          },
        });
        createdMoves.push(move);
      } else if (doc.type === 'adjustment') {
        const targetLocId = item.fromLocationId || item.toLocationId;
        if (!targetLocId) {
          throw new Error(`Adjustment for ${product.name} must specify a warehouse location.`);
        }

        const currentStock = await tx.stockQuantity.findUnique({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: targetLocId,
            },
          },
        });

        const systemQty = currentStock?.quantity || 0;
        const countedQty = item.countedQuantity !== null && item.countedQuantity !== undefined
          ? item.countedQuantity
          : item.quantity;
        const delta = countedQty - systemQty;

        // Set stock directly to counted quantity
        await tx.stockQuantity.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: targetLocId,
            },
          },
          update: { quantity: countedQty },
          create: {
            productId: product.id,
            locationId: targetLocId,
            quantity: countedQty,
          },
        });

        // Determine move direction based on delta
        const fromLoc = delta >= 0 ? locAdj.id : targetLocId;
        const toLoc = delta >= 0 ? targetLocId : locAdj.id;
        const absQty = Math.abs(delta);

        const allInternalStock = await tx.stockQuantity.findMany({
          where: {
            productId: product.id,
            location: { isVirtual: false },
          },
        });
        const totalBalanceAfter = allInternalStock.reduce((s: number, q: any) => s + q.quantity, 0);

        const move = await tx.stockMove.create({
          data: {
            documentId: doc.id,
            productId: product.id,
            fromLocationId: fromLoc,
            toLocationId: toLoc,
            quantity: absQty,
            balanceAfter: totalBalanceAfter,
            transactionType: 'adjustment',
            referenceNumber: doc.documentNumber,
            userId,
            reason: doc.notes || (delta < 0 ? `Inventory shrink/damage: ${delta} ${product.uom}` : `Audit gain: +${delta} ${product.uom}`),
          },
        });
        createdMoves.push(move);
      }
    }

    // 2. Mark document as done and set validatedAt
    const updatedDoc = await tx.document.update({
      where: { id: doc.id },
      data: {
        status: 'done',
        validatedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });

    return { document: updatedDoc, moves: createdMoves };
  });
}
