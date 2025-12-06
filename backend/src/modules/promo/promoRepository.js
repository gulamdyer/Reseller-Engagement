/**
 * Promotions Repository
 * Database operations for promotions and promo SKUs
 */

const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Get all promotions with optional filters
 */
async function getAllPromos(filters = {}) {
  try {
    let sql = `
      SELECT
        p.PROMO_ID,
        p.PROMO_NAME,
        p.DESCRIPTION,
        p.START_DT,
        p.END_DT,
        p.TARGET_SEGMENT,
        p.STATUS_CODE,
        p.CREATED_BY,
        p.CREATED_AT,
        (SELECT COUNT(*) FROM SALR_E_PROMO_SKU ps WHERE ps.PROMO_ID = p.PROMO_ID) AS SKU_COUNT
      FROM SALR_E_PROMO p
      WHERE 1=1
    `;

    const binds = {};

    if (filters.status) {
      sql += ` AND p.STATUS_CODE = :status`;
      binds.status = filters.status;
    }

    if (filters.targetSegment) {
      sql += ` AND p.TARGET_SEGMENT = :targetSegment`;
      binds.targetSegment = filters.targetSegment;
    }

    sql += ` ORDER BY p.CREATED_AT DESC`;

    const result = await db.queryAll(sql, binds);
    return result;
  } catch (error) {
    logger.error('Error fetching promos', { error: error.message });
    throw error;
  }
}

/**
 * Get a single promo by ID with SKUs
 */
async function getPromoById(promoId) {
  try {
    const promoSql = `
      SELECT
        PROMO_ID,
        PROMO_NAME,
        DESCRIPTION,
        START_DT,
        END_DT,
        TARGET_SEGMENT,
        STATUS_CODE,
        CREATED_BY,
        CREATED_AT,
        UPDATED_BY,
        UPDATED_AT
      FROM SALR_E_PROMO
      WHERE PROMO_ID = :promoId
    `;

    const promo = await db.queryOne(promoSql, { promoId });

    if (!promo) {
      return null;
    }

    // Get SKUs for this promo
    const skusSql = `
      SELECT
        PROMO_SKU_ID,
        PROMO_ID,
        SKU_ID,
        SKU_CODE,
        SKU_NAME,
        BEFORE_PRICE,
        OFFER_PRICE,
        DISCOUNT_PERCENT,
        ASSET_URL,
        CAPTION_EN,
        CAPTION_AR,
        CREATED_AT
      FROM SALR_E_PROMO_SKU
      WHERE PROMO_ID = :promoId
      ORDER BY SKU_CODE
    `;

    const skus = await db.queryAll(skusSql, { promoId });

    return {
      ...promo,
      skus,
    };
  } catch (error) {
    logger.error('Error fetching promo by ID', { promoId, error: error.message });
    throw error;
  }
}

/**
 * Create a new promotion
 */
async function createPromo(promoData, username) {
  try {
    const sql = `
      INSERT INTO SALR_E_PROMO (
        PROMO_NAME, DESCRIPTION, START_DT, END_DT, TARGET_SEGMENT, STATUS_CODE, CREATED_BY, CREATED_AT
      ) VALUES (
        :promoName, :description, :startDt, :endDt, :targetSegment, :statusCode, :createdBy, SYSDATE
      ) RETURNING PROMO_ID INTO :promoId
    `;

    const binds = {
      promoName: promoData.promoName,
      description: promoData.description || null,
      startDt: new Date(promoData.startDt),
      endDt: new Date(promoData.endDt),
      targetSegment: promoData.targetSegment || 'ALL',
      statusCode: promoData.statusCode || 'DRAFT',
      createdBy: username,
      promoId: { type: db.oracledb.NUMBER, dir: db.oracledb.BIND_OUT },
    };

    const result = await db.executeQuery(sql, binds, { autoCommit: true });
    const promoId = result.outBinds.promoId[0];

    logger.logBusiness('Promotion created', { promoId, promoName: promoData.promoName });

    return promoId;
  } catch (error) {
    logger.error('Error creating promo', { error: error.message });
    throw error;
  }
}

/**
 * Update a promotion
 */
async function updatePromo(promoId, promoData, username) {
  try {
    const sql = `
      UPDATE SALR_E_PROMO
      SET
        PROMO_NAME = :promoName,
        DESCRIPTION = :description,
        START_DT = :startDt,
        END_DT = :endDt,
        TARGET_SEGMENT = :targetSegment,
        STATUS_CODE = :statusCode,
        UPDATED_BY = :updatedBy,
        UPDATED_AT = SYSDATE
      WHERE PROMO_ID = :promoId
    `;

    const result = await db.executeNonQuery(sql, {
      promoId,
      promoName: promoData.promoName,
      description: promoData.description || null,
      startDt: new Date(promoData.startDt),
      endDt: new Date(promoData.endDt),
      targetSegment: promoData.targetSegment,
      statusCode: promoData.statusCode,
      updatedBy: username,
    }, true);

    return result > 0;
  } catch (error) {
    logger.error('Error updating promo', { promoId, error: error.message });
    throw error;
  }
}

/**
 * Add SKU to promotion
 */
async function addPromoSku(promoSkuData) {
  try {
    const sql = `
      INSERT INTO SALR_E_PROMO_SKU (
        PROMO_ID, SKU_ID, SKU_CODE, SKU_NAME, BEFORE_PRICE, OFFER_PRICE, DISCOUNT_PERCENT,
        ASSET_URL, CAPTION_EN, CAPTION_AR, CREATED_AT
      ) VALUES (
        :promoId, :skuId, :skuCode, :skuName, :beforePrice, :offerPrice, :discountPercent,
        :assetUrl, :captionEn, :captionAr, SYSDATE
      ) RETURNING PROMO_SKU_ID INTO :promoSkuId
    `;

    const discountPercent = ((promoSkuData.beforePrice - promoSkuData.offerPrice) / promoSkuData.beforePrice) * 100;

    const binds = {
      promoId: promoSkuData.promoId,
      skuId: promoSkuData.skuId,
      skuCode: promoSkuData.skuCode,
      skuName: promoSkuData.skuName,
      beforePrice: promoSkuData.beforePrice,
      offerPrice: promoSkuData.offerPrice,
      discountPercent: Math.round(discountPercent * 100) / 100,
      assetUrl: promoSkuData.assetUrl || null,
      captionEn: promoSkuData.captionEn || null,
      captionAr: promoSkuData.captionAr || null,
      promoSkuId: { type: db.oracledb.NUMBER, dir: db.oracledb.BIND_OUT },
    };

    const result = await db.executeQuery(sql, binds, { autoCommit: true });
    return result.outBinds.promoSkuId[0];
  } catch (error) {
    logger.error('Error adding promo SKU', { error: error.message });
    throw error;
  }
}

/**
 * Delete promo SKU
 */
async function deletePromoSku(promoSkuId) {
  try {
    const sql = `DELETE FROM SALR_E_PROMO_SKU WHERE PROMO_SKU_ID = :promoSkuId`;
    const result = await db.executeNonQuery(sql, { promoSkuId }, true);
    return result > 0;
  } catch (error) {
    logger.error('Error deleting promo SKU', { promoSkuId, error: error.message });
    throw error;
  }
}

/**
 * Update promo status
 */
async function updatePromoStatus(promoId, statusCode, username) {
  try {
    const sql = `
      UPDATE SALR_E_PROMO
      SET STATUS_CODE = :statusCode,
          UPDATED_BY = :updatedBy,
          UPDATED_AT = SYSDATE
      WHERE PROMO_ID = :promoId
    `;

    const result = await db.executeNonQuery(sql, { promoId, statusCode, updatedBy: username }, true);
    logger.logBusiness('Promo status updated', { promoId, statusCode });
    return result > 0;
  } catch (error) {
    logger.error('Error updating promo status', { promoId, error: error.message });
    throw error;
  }
}

module.exports = {
  getAllPromos,
  getPromoById,
  createPromo,
  updatePromo,
  addPromoSku,
  deletePromoSku,
  updatePromoStatus,
};
