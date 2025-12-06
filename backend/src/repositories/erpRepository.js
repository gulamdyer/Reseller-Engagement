/**
 * ERP (Spine) Repository
 * Centralizes all Oracle queries to ERP/Spine tables
 *
 * NOTE: Table and column names are placeholders and should be adjusted
 * to match actual Spine ERP schema
 */

const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Get all resellers with optional filters
 * @param {object} filters - { region, status, searchTerm }
 */
async function getResellers(filters = {}) {
  try {
    let sql = `
      SELECT
        RESELLER_ID,
        RESELLER_CODE,
        RESELLER_NAME,
        REGION,
        CONTACT_PERSON,
        PHONE,
        EMAIL,
        WHATSAPP_NUMBER,
        STATUS,
        CREDIT_LIMIT,
        CREATED_DATE,
        LAST_MODIFIED_DATE
      FROM SPINE_RESELLER
      WHERE 1=1
    `;

    const binds = {};

    if (filters.region) {
      sql += ` AND REGION = :region`;
      binds.region = filters.region;
    }

    if (filters.status) {
      sql += ` AND STATUS = :status`;
      binds.status = filters.status;
    }

    if (filters.searchTerm) {
      sql += ` AND (
        UPPER(RESELLER_NAME) LIKE UPPER(:searchTerm) OR
        UPPER(RESELLER_CODE) LIKE UPPER(:searchTerm) OR
        UPPER(CONTACT_PERSON) LIKE UPPER(:searchTerm)
      )`;
      binds.searchTerm = `%${filters.searchTerm}%`;
    }

    sql += ` ORDER BY RESELLER_NAME`;

    const result = await db.queryAll(sql, binds);
    logger.logDbOperation('getResellers', { count: result.length, filters });

    return result;
  } catch (error) {
    logger.error('Error fetching resellers from ERP', { error: error.message });
    throw error;
  }
}

/**
 * Get a single reseller by ID
 */
async function getResellerById(resellerId) {
  try {
    const sql = `
      SELECT
        RESELLER_ID,
        RESELLER_CODE,
        RESELLER_NAME,
        REGION,
        CONTACT_PERSON,
        PHONE,
        EMAIL,
        WHATSAPP_NUMBER,
        STATUS,
        CREDIT_LIMIT,
        OUTSTANDING_BALANCE,
        CREATED_DATE,
        LAST_MODIFIED_DATE
      FROM SPINE_RESELLER
      WHERE RESELLER_ID = :resellerId
    `;

    const result = await db.queryOne(sql, { resellerId });
    return result;
  } catch (error) {
    logger.error('Error fetching reseller by ID', { resellerId, error: error.message });
    throw error;
  }
}

/**
 * Get reseller by WhatsApp number
 */
async function getResellerByWhatsApp(whatsappNumber) {
  try {
    const sql = `
      SELECT
        RESELLER_ID,
        RESELLER_CODE,
        RESELLER_NAME,
        REGION,
        WHATSAPP_NUMBER,
        EMAIL,
        STATUS
      FROM SPINE_RESELLER
      WHERE WHATSAPP_NUMBER = :whatsappNumber
        AND STATUS = 'ACTIVE'
    `;

    const result = await db.queryOne(sql, { whatsappNumber });
    return result;
  } catch (error) {
    logger.error('Error fetching reseller by WhatsApp', { whatsappNumber, error: error.message });
    throw error;
  }
}

/**
 * Get resellers with activity summary
 */
async function getResellersWithActivity(filters = {}) {
  try {
    let sql = `
      SELECT
        r.RESELLER_ID,
        r.RESELLER_NAME,
        r.REGION,
        r.STATUS,
        r.WHATSAPP_NUMBER,
        (SELECT MAX(ORDER_DATE)
         FROM SPINE_SALES_ORDER so
         WHERE so.RESELLER_ID = r.RESELLER_ID) AS LAST_ORDER_DATE,
        (SELECT COUNT(*)
         FROM SPINE_SALES_ORDER so
         WHERE so.RESELLER_ID = r.RESELLER_ID
           AND so.ORDER_DATE >= ADD_MONTHS(SYSDATE, -12)) AS ORDERS_LAST_12M,
        (SELECT SUM(TOTAL_AMOUNT)
         FROM SPINE_INVOICE inv
         WHERE inv.RESELLER_ID = r.RESELLER_ID
           AND inv.INVOICE_DATE >= ADD_MONTHS(SYSDATE, -12)) AS SALES_LAST_12M
      FROM SPINE_RESELLER r
      WHERE r.STATUS = 'ACTIVE'
    `;

    const binds = {};

    if (filters.region) {
      sql += ` AND r.REGION = :region`;
      binds.region = filters.region;
    }

    sql += ` ORDER BY r.RESELLER_NAME`;

    const result = await db.queryAll(sql, binds);
    return result;
  } catch (error) {
    logger.error('Error fetching resellers with activity', { error: error.message });
    throw error;
  }
}

/**
 * Get last order date for a reseller
 */
async function getLastOrderDateForReseller(resellerId) {
  try {
    const sql = `
      SELECT MAX(ORDER_DATE) AS LAST_ORDER_DATE
      FROM SPINE_SALES_ORDER
      WHERE RESELLER_ID = :resellerId
    `;

    const result = await db.queryOne(sql, { resellerId });
    return result?.LAST_ORDER_DATE || null;
  } catch (error) {
    logger.error('Error fetching last order date', { resellerId, error: error.message });
    throw error;
  }
}

/**
 * Get sales for a reseller in a specific period
 */
async function getSalesForResellerInPeriod(resellerId, fromDate, toDate) {
  try {
    const sql = `
      SELECT
        inv.INVOICE_ID,
        inv.INVOICE_NO,
        inv.INVOICE_DATE,
        inv.TOTAL_AMOUNT,
        inv.TAX_AMOUNT,
        inv.NET_AMOUNT,
        inv.STATUS
      FROM SPINE_INVOICE inv
      WHERE inv.RESELLER_ID = :resellerId
        AND inv.INVOICE_DATE >= :fromDate
        AND inv.INVOICE_DATE <= :toDate
      ORDER BY inv.INVOICE_DATE DESC
    `;

    const result = await db.queryAll(sql, { resellerId, fromDate, toDate });
    return result;
  } catch (error) {
    logger.error('Error fetching sales for reseller', {
      resellerId,
      fromDate,
      toDate,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get total sales amount for a reseller in a period
 */
async function getTotalSalesForReseller(resellerId, fromDate, toDate) {
  try {
    const sql = `
      SELECT
        COUNT(*) AS INVOICE_COUNT,
        SUM(TOTAL_AMOUNT) AS TOTAL_SALES,
        SUM(NET_AMOUNT) AS NET_SALES
      FROM SPINE_INVOICE
      WHERE RESELLER_ID = :resellerId
        AND INVOICE_DATE >= :fromDate
        AND INVOICE_DATE <= :toDate
        AND STATUS IN ('POSTED', 'PAID')
    `;

    const result = await db.queryOne(sql, { resellerId, fromDate, toDate });
    return result;
  } catch (error) {
    logger.error('Error calculating total sales', { resellerId, error: error.message });
    throw error;
  }
}

/**
 * Get all SKUs with optional filters
 */
async function getSKUs(filters = {}) {
  try {
    let sql = `
      SELECT
        SKU_ID,
        SKU_CODE,
        SKU_NAME,
        CATEGORY,
        UNIT_PRICE,
        STOCK_QTY,
        REORDER_LEVEL,
        STATUS
      FROM SPINE_SKU
      WHERE STATUS = 'ACTIVE'
    `;

    const binds = {};

    if (filters.category) {
      sql += ` AND CATEGORY = :category`;
      binds.category = filters.category;
    }

    if (filters.searchTerm) {
      sql += ` AND (
        UPPER(SKU_CODE) LIKE UPPER(:searchTerm) OR
        UPPER(SKU_NAME) LIKE UPPER(:searchTerm)
      )`;
      binds.searchTerm = `%${filters.searchTerm}%`;
    }

    sql += ` ORDER BY SKU_NAME`;

    const result = await db.queryAll(sql, binds);
    return result;
  } catch (error) {
    logger.error('Error fetching SKUs', { error: error.message });
    throw error;
  }
}

/**
 * Get a single SKU by ID or code
 */
async function getSKU(identifier) {
  try {
    const sql = `
      SELECT
        SKU_ID,
        SKU_CODE,
        SKU_NAME,
        CATEGORY,
        UNIT_PRICE,
        STOCK_QTY,
        REORDER_LEVEL,
        STATUS
      FROM SPINE_SKU
      WHERE (SKU_ID = :identifier OR UPPER(SKU_CODE) = UPPER(:identifier))
        AND STATUS = 'ACTIVE'
    `;

    const result = await db.queryOne(sql, { identifier });
    return result;
  } catch (error) {
    logger.error('Error fetching SKU', { identifier, error: error.message });
    throw error;
  }
}

/**
 * Check SKU availability (stock check)
 */
async function checkSkuAvailability(skuCode) {
  try {
    const sql = `
      SELECT
        SKU_ID,
        SKU_CODE,
        SKU_NAME,
        STOCK_QTY,
        REORDER_LEVEL,
        STATUS,
        CASE
          WHEN STOCK_QTY > 0 THEN 'YES'
          ELSE 'NO'
        END AS AVAILABLE
      FROM SPINE_SKU
      WHERE UPPER(SKU_CODE) = UPPER(:skuCode)
        AND STATUS = 'ACTIVE'
    `;

    const result = await db.queryOne(sql, { skuCode });
    return result;
  } catch (error) {
    logger.error('Error checking SKU availability', { skuCode, error: error.message });
    throw error;
  }
}

/**
 * Get slow-moving SKUs
 * SKUs with low sales in recent period
 */
async function getSlowMovingSkus(criteria = {}) {
  try {
    const monthsBack = criteria.monthsBack || 6;
    const maxSalesQty = criteria.maxSalesQty || 10;

    const sql = `
      SELECT
        s.SKU_ID,
        s.SKU_CODE,
        s.SKU_NAME,
        s.CATEGORY,
        s.UNIT_PRICE,
        s.STOCK_QTY,
        NVL(sales.TOTAL_QTY_SOLD, 0) AS QTY_SOLD_RECENT,
        NVL(sales.TOTAL_SALES, 0) AS SALES_RECENT
      FROM SPINE_SKU s
      LEFT JOIN (
        SELECT
          sod.SKU_ID,
          SUM(sod.QUANTITY) AS TOTAL_QTY_SOLD,
          SUM(sod.LINE_TOTAL) AS TOTAL_SALES
        FROM SPINE_SALES_ORDER_DETAIL sod
        JOIN SPINE_SALES_ORDER so ON sod.ORDER_ID = so.ORDER_ID
        WHERE so.ORDER_DATE >= ADD_MONTHS(SYSDATE, :monthsBack)
        GROUP BY sod.SKU_ID
      ) sales ON s.SKU_ID = sales.SKU_ID
      WHERE s.STATUS = 'ACTIVE'
        AND s.STOCK_QTY > 0
        AND NVL(sales.TOTAL_QTY_SOLD, 0) <= :maxSalesQty
      ORDER BY QTY_SOLD_RECENT ASC, s.STOCK_QTY DESC
    `;

    const result = await db.queryAll(sql, {
      monthsBack: -monthsBack,
      maxSalesQty
    });

    logger.logDbOperation('getSlowMovingSkus', {
      count: result.length,
      criteria
    });

    return result;
  } catch (error) {
    logger.error('Error fetching slow-moving SKUs', { error: error.message });
    throw error;
  }
}

/**
 * Get overstocked SKUs
 * SKUs with stock quantity significantly above reorder level
 */
async function getOverstockedSkus(criteria = {}) {
  try {
    const overstockMultiplier = criteria.overstockMultiplier || 3;

    const sql = `
      SELECT
        SKU_ID,
        SKU_CODE,
        SKU_NAME,
        CATEGORY,
        UNIT_PRICE,
        STOCK_QTY,
        REORDER_LEVEL,
        ROUND((STOCK_QTY / NULLIF(REORDER_LEVEL, 0)), 2) AS OVERSTOCK_RATIO
      FROM SPINE_SKU
      WHERE STATUS = 'ACTIVE'
        AND REORDER_LEVEL > 0
        AND STOCK_QTY > (REORDER_LEVEL * :overstockMultiplier)
      ORDER BY OVERSTOCK_RATIO DESC
    `;

    const result = await db.queryAll(sql, { overstockMultiplier });

    logger.logDbOperation('getOverstockedSkus', {
      count: result.length,
      criteria
    });

    return result;
  } catch (error) {
    logger.error('Error fetching overstocked SKUs', { error: error.message });
    throw error;
  }
}

/**
 * Get SKU sales statistics for a period
 */
async function getSkuSalesStats(skuId, fromDate, toDate) {
  try {
    const sql = `
      SELECT
        s.SKU_ID,
        s.SKU_CODE,
        s.SKU_NAME,
        COUNT(DISTINCT sod.ORDER_ID) AS ORDER_COUNT,
        SUM(sod.QUANTITY) AS TOTAL_QTY_SOLD,
        SUM(sod.LINE_TOTAL) AS TOTAL_SALES,
        AVG(sod.UNIT_PRICE) AS AVG_SELLING_PRICE
      FROM SPINE_SKU s
      LEFT JOIN SPINE_SALES_ORDER_DETAIL sod ON s.SKU_ID = sod.SKU_ID
      LEFT JOIN SPINE_SALES_ORDER so ON sod.ORDER_ID = so.ORDER_ID
        AND so.ORDER_DATE >= :fromDate
        AND so.ORDER_DATE <= :toDate
      WHERE s.SKU_ID = :skuId
      GROUP BY s.SKU_ID, s.SKU_CODE, s.SKU_NAME
    `;

    const result = await db.queryOne(sql, { skuId, fromDate, toDate });
    return result;
  } catch (error) {
    logger.error('Error fetching SKU sales stats', { skuId, error: error.message });
    throw error;
  }
}

/**
 * Get account manager for reseller (round-robin or predefined mapping)
 */
async function getAccountManagerForReseller(resellerId) {
  try {
    // Try to get assigned account manager from reseller record
    const sql = `
      SELECT
        ACCOUNT_MANAGER_ID,
        ACCOUNT_MANAGER_NAME,
        ACCOUNT_MANAGER_EMAIL
      FROM SPINE_RESELLER
      WHERE RESELLER_ID = :resellerId
    `;

    const result = await db.queryOne(sql, { resellerId });

    if (result?.ACCOUNT_MANAGER_ID) {
      return {
        managerId: result.ACCOUNT_MANAGER_ID,
        managerName: result.ACCOUNT_MANAGER_NAME,
        managerEmail: result.ACCOUNT_MANAGER_EMAIL,
      };
    }

    // Fallback: return default/round-robin manager
    // This is a placeholder - implement your round-robin logic
    return {
      managerId: 'DEFAULT_MGR',
      managerName: 'Default Manager',
      managerEmail: 'manager@sedar.com',
    };
  } catch (error) {
    logger.error('Error fetching account manager', { resellerId, error: error.message });
    // Return default on error
    return {
      managerId: 'DEFAULT_MGR',
      managerName: 'Default Manager',
      managerEmail: 'manager@sedar.com',
    };
  }
}

module.exports = {
  getResellers,
  getResellerById,
  getResellerByWhatsApp,
  getResellersWithActivity,
  getLastOrderDateForReseller,
  getSalesForResellerInPeriod,
  getTotalSalesForReseller,
  getSKUs,
  getSKU,
  checkSkuAvailability,
  getSlowMovingSkus,
  getOverstockedSkus,
  getSkuSalesStats,
  getAccountManagerForReseller,
};
