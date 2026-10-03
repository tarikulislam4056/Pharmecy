import { Product, SaleInvoice, Category } from '../types';

export interface ProductDemandForecast {
  product: Product;
  totalSold90Days: number;
  month1Sold: number; // 61-90 days ago
  month2Sold: number; // 31-60 days ago
  month3Sold: number; // 0-30 days ago
  dailyVelocity: number; // units/day
  monthlyVelocity: number; // units/month
  salesTrend: 'RISING' | 'FALLING' | 'STABLE' | 'NO_SALES';
  currentStock: number;
  reorderLevel: number;
  daysRemaining: number;
  demand30Days: number;
  demand60Days: number;
  suggestedRestockQty: number;
  estimatedRestockCost: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  aiRecommendationBn: string;
  aiRecommendationEn: string;
}

export interface DemandForecastSummary {
  items: ProductDemandForecast[];
  totalCriticalItems: number;
  totalHighRiskItems: number;
  totalModerateRiskItems: number;
  totalSuggestedRestockCost: number;
  topMovingProducts: ProductDemandForecast[];
  urgentRestockProducts: ProductDemandForecast[];
  overstockedProducts: ProductDemandForecast[];
}

/**
 * Calculates demand forecast metrics based on last 90 days of sales velocity
 */
export function calculateDemandForecast(
  products: Product[],
  saleInvoices: SaleInvoice[],
  categories: Category[] = []
): DemandForecastSummary {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Map product sales by date buckets
  const productSalesMap = new Map<
    string,
    { m1: number; m2: number; m3: number; total: number }
  >();

  // Filter non-cancelled invoices in 90 days
  saleInvoices.forEach((inv) => {
    if (!inv.date) return;
    const invDate = new Date(inv.date);
    if (isNaN(invDate.getTime()) || invDate < ninetyDaysAgo) return;

    inv.items.forEach((item) => {
      if (!item.productId) return;
      const pId = item.productId;
      const qty = Number(item.quantity) || 0;

      if (!productSalesMap.has(pId)) {
        productSalesMap.set(pId, { m1: 0, m2: 0, m3: 0, total: 0 });
      }

      const record = productSalesMap.get(pId)!;
      record.total += qty;

      if (invDate >= thirtyDaysAgo) {
        record.m3 += qty; // Most recent month
      } else if (invDate >= sixtyDaysAgo) {
        record.m2 += qty; // 2nd month ago
      } else {
        record.m1 += qty; // 3rd month ago
      }
    });
  });

  const forecasts: ProductDemandForecast[] = products.map((product) => {
    const salesData = productSalesMap.get(product.id) || {
      m1: 0,
      m2: 0,
      m3: 0,
      total: 0,
    };

    const totalSold90Days = salesData.total;
    const month1Sold = salesData.m1;
    const month2Sold = salesData.m2;
    const month3Sold = salesData.m3;

    // Velocity
    const dailyVelocity = totalSold90Days / 90;
    const monthlyVelocity = totalSold90Days / 3;

    // Trend analysis
    let salesTrend: 'RISING' | 'FALLING' | 'STABLE' | 'NO_SALES' = 'STABLE';
    if (totalSold90Days === 0) {
      salesTrend = 'NO_SALES';
    } else if (month3Sold > month2Sold && month2Sold >= month1Sold) {
      salesTrend = 'RISING';
    } else if (month3Sold < month2Sold && month2Sold <= month1Sold) {
      salesTrend = 'FALLING';
    } else if (month3Sold > month2Sold * 1.2) {
      salesTrend = 'RISING';
    } else if (month3Sold < month2Sold * 0.7) {
      salesTrend = 'FALLING';
    }

    const currentStock = Math.max(0, product.stock || 0);
    const reorderLevel = product.reorderLevel || 10;

    // Days remaining based on daily velocity
    let daysRemaining = 999;
    if (dailyVelocity > 0) {
      daysRemaining = Math.floor(currentStock / dailyVelocity);
    } else if (currentStock === 0) {
      daysRemaining = 0;
    }

    // Demand projections
    const demand30Days = Math.ceil(dailyVelocity * 30);
    const demand60Days = Math.ceil(dailyVelocity * 60);

    // Buffer is safety stock: max of reorderLevel or 10 days of sales
    const safetyBuffer = Math.max(reorderLevel, Math.ceil(dailyVelocity * 10));
    const targetStock = demand30Days + safetyBuffer;

    let suggestedRestockQty = 0;
    if (currentStock < targetStock) {
      suggestedRestockQty = Math.ceil(targetStock - currentStock);
    }

    const estimatedRestockCost = suggestedRestockQty * (product.purchasePrice || 0);

    // Risk level classification
    let riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';

    if (currentStock === 0 && (dailyVelocity > 0 || totalSold90Days > 0)) {
      riskLevel = 'CRITICAL';
    } else if (daysRemaining <= 7 && dailyVelocity > 0) {
      riskLevel = 'CRITICAL';
    } else if (daysRemaining <= 15 && dailyVelocity > 0) {
      riskLevel = 'HIGH';
    } else if (daysRemaining <= 30 && dailyVelocity > 0) {
      riskLevel = 'MODERATE';
    } else if (currentStock <= reorderLevel) {
      riskLevel = 'HIGH';
    } else {
      riskLevel = 'LOW';
    }

    // AI Recommendation synthesis
    let aiRecommendationBn = '';
    let aiRecommendationEn = '';

    if (riskLevel === 'CRITICAL') {
      if (currentStock === 0) {
        aiRecommendationBn = `অ্যালার্ট: স্টক সম্পূর্ণ শূন্য! গত ৯০ দিনে ${totalSold90Days} টি বিক্রি হয়েছে। অবিলম্বে কমপক্ষে ${suggestedRestockQty} টি পুনঃক্রয় করুন।`;
        aiRecommendationEn = `CRITICAL: Out of stock! Sold ${totalSold90Days} units in 90 days. Immediate reorder of ${suggestedRestockQty} units recommended.`;
      } else {
        aiRecommendationBn = `জরুরী: মাত্র ${daysRemaining} দিনের স্টক বাকি আছে! মাসিক বিক্রয় গতি ${monthlyVelocity.toFixed(1)} টি। দ্রুত ${suggestedRestockQty} টি স্টক যুক্ত করুন।`;
        aiRecommendationEn = `CRITICAL: Only ${daysRemaining} days of stock remaining! Monthly velocity ${monthlyVelocity.toFixed(1)} units. Reorder ${suggestedRestockQty} units urgently.`;
      }
    } else if (riskLevel === 'HIGH') {
      aiRecommendationBn = `উচ্চ ঝুঁকি: ${daysRemaining} দিনের মধ্যে স্টক শেষ হতে পারে। আগামী ৩০ দিনের চাহিদা প্রায় ${demand30Days} টি। ${suggestedRestockQty} টি অর্ডারের পরামর্শ।`;
      aiRecommendationEn = `HIGH RISK: Stockout expected in ${daysRemaining} days. 30-day demand ~${demand30Days} units. Order ${suggestedRestockQty} units soon.`;
    } else if (riskLevel === 'MODERATE') {
      aiRecommendationBn = `মাঝারি ঝুঁকি: স্টক রয়েছে ${daysRemaining} দিনের। বিক্রয় ট্রেন্ড ${salesTrend === 'RISING' ? 'উর্ধ্বমুখী 📈' : 'স্বাভাবিক'}`;
      aiRecommendationEn = `MODERATE RISK: ${daysRemaining} days of inventory remaining. Trend is ${salesTrend}.`;
    } else if (salesTrend === 'NO_SALES' && currentStock > 50) {
      aiRecommendationBn = `স্লো মুভিং: গত ৯০ দিনে কোন বিক্রি নেই। বর্তমান স্টক ${currentStock} টি। প্রমোশনাল ডিসকাউন্ট বিবেচনা করুন।`;
      aiRecommendationEn = `SLOW MOVING: Zero sales in 90 days. Current stock ${currentStock} units. Consider promotional clearance.`;
    } else {
      aiRecommendationBn = `পর্যাপ্ত মজুদ: ${daysRemaining > 300 ? '৩০+' : daysRemaining} দিনের স্টক আছে। বিক্রয় গতি স্বাভাবিক।`;
      aiRecommendationEn = `HEALTHY: ${daysRemaining > 300 ? '30+' : daysRemaining} days of supply. Velocity is stable.`;
    }

    return {
      product,
      totalSold90Days,
      month1Sold,
      month2Sold,
      month3Sold,
      dailyVelocity,
      monthlyVelocity,
      salesTrend,
      currentStock,
      reorderLevel,
      daysRemaining,
      demand30Days,
      demand60Days,
      suggestedRestockQty,
      estimatedRestockCost,
      riskLevel,
      aiRecommendationBn,
      aiRecommendationEn,
    };
  });

  // Sort forecasts: Critical first, then High risk, then highest monthly velocity
  forecasts.sort((a, b) => {
    const riskOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }
    return b.monthlyVelocity - a.monthlyVelocity;
  });

  const totalCriticalItems = forecasts.filter((f) => f.riskLevel === 'CRITICAL').length;
  const totalHighRiskItems = forecasts.filter((f) => f.riskLevel === 'HIGH').length;
  const totalModerateRiskItems = forecasts.filter((f) => f.riskLevel === 'MODERATE').length;
  const totalSuggestedRestockCost = forecasts.reduce(
    (sum, f) => sum + f.estimatedRestockCost,
    0
  );

  const topMovingProducts = [...forecasts]
    .sort((a, b) => b.totalSold90Days - a.totalSold90Days)
    .slice(0, 5);

  const urgentRestockProducts = forecasts.filter(
    (f) => f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH'
  );

  const overstockedProducts = forecasts.filter(
    (f) => f.salesTrend === 'NO_SALES' && f.currentStock > 30
  );

  return {
    items: forecasts,
    totalCriticalItems,
    totalHighRiskItems,
    totalModerateRiskItems,
    totalSuggestedRestockCost,
    topMovingProducts,
    urgentRestockProducts,
    overstockedProducts,
  };
}
