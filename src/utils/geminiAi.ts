import { GoogleGenAI } from '@google/genai';
import { DemandForecastSummary, ProductDemandForecast } from './demandForecast';

const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

let aiClient: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.warn('[Gemini AI] Initialization skipped:', err);
  }
}

/**
 * Generate AI Demand Analysis report for overall inventory using Gemini
 */
export async function generateAiSupplyChainInsight(
  summary: DemandForecastSummary,
  language: 'en' | 'bn' = 'bn'
): Promise<string> {
  const prompt = `
You are an expert ERP Supply Chain AI Advisor for retail and wholesale businesses in Bangladesh.
Analyze the following 90-day inventory demand forecast summary and provide an executive supply chain strategy report in ${
    language === 'bn' ? 'Bengali (বাংলা)' : 'English'
  }.

INVENTORY DEMAND METRICS:
- Total Products Analyzed: ${summary.items.length}
- Critical Stockout Risk Items (Out of stock or <7 days left): ${summary.totalCriticalItems}
- High Stockout Risk Items (<15 days left): ${summary.totalHighRiskItems}
- Moderate Risk Items (<30 days left): ${summary.totalModerateRiskItems}
- Total Estimated Capital Needed for Restocking: ৳${summary.totalSuggestedRestockCost.toLocaleString()}

TOP MOVING PRODUCTS (LAST 90 DAYS):
${summary.topMovingProducts
  .map(
    (p, i) =>
      `${i + 1}. ${p.product.name} - Sold: ${p.totalSold90Days} units (Monthly Velocity: ${p.monthlyVelocity.toFixed(
        1
      )} units/mo), Stock: ${p.currentStock}, Days Left: ${p.daysRemaining}`
  )
  .join('\n')}

URGENT RESTOCK ITEMS:
${summary.urgentRestockProducts
  .slice(0, 5)
  .map(
    (p, i) =>
      `${i + 1}. ${p.product.name} - Current Stock: ${p.currentStock}, Needed in 30d: ${p.demand30Days}, Reorder Suggestion: +${p.suggestedRestockQty} units`
  )
  .join('\n')}

INSTRUCTIONS:
1. Provide a concise executive 3-bullet action plan.
2. Highlight capital allocation priorities (which items to order first to maximize cash flow and prevent sales loss).
3. Identify seasonal or slow-moving risks.
4. Keep the tone professional, actionable, and formatted in clean markdown bullet points.
`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('[Gemini AI Request Error, falling back to heuristic AI report]:', err);
    }
  }

  // Smart Heuristic Fallback Report
  if (language === 'bn') {
    return `### 🤖 dokanPro AI ডিমান্ড ফোরকাস্ট রিপোর্ট

**১. স্টকআউট অ্যালার্ট ও রিস্ক সামারি:**
* বর্তমানে **${summary.totalCriticalItems} টি পণ্য ক্রিসিক্যাল ঝুঁকিতে** রয়েছে (স্টক শূন্য অথবা ৭ দিনের কম মজুদ)।
* আগামী ৩০ দিনের চাহিদা পূরণে আনুমানিক **৳${summary.totalSuggestedRestockCost.toLocaleString()}** মূলধন প্রয়োজন।

**২. অবিলম্বে পুনঃক্রয় সুপারিশ:**
${
  summary.urgentRestockProducts.length > 0
    ? summary.urgentRestockProducts
        .slice(0, 4)
        .map(
          (p) =>
            `* **${p.product.name}**: বর্তমান মজুদ ${p.currentStock} টি, আগামী ৩০ দিনের পূর্বাভাস ${p.demand30Days} টি। অবিলম্বে **+${p.suggestedRestockQty} টি** অর্ডার করুন।`
        )
        .join('\n')
    : '* সকল চলমান পণ্যের পর্যাপ্ত মজুদ রয়েছে।'
}

**৩. ক্যাশফ্লো ও ওয়ার্কিং ক্যাপিটাল কৌশল:**
* **টপ সেলিং পণ্যে গুরুত্ব দিন**: গত ৯০ দিনে সবচেয়ে দ্রুত বিক্রিত পণ্যগুলোতে ক্যাপিটাল বরাদ্দ অগ্রাধিকার দিন যাতে কাস্টমার ফেরত না যায়।
* **স্লোগানিং পণ্য চিহ্নিতকরণ**: ${
      summary.overstockedProducts.length
    } টি অলস পণ্যে ক্যাপিটাল আটকে আছে। ডিসকাউন্ট প্রমোশনের মাধ্যমে মূলধন রিকভার করার পরামর্শ দেওয়া হচ্ছে।`;
  } else {
    return `### 🤖 dokanPro AI Demand Forecast Executive Report

**1. Critical Stockout Risk Summary:**
* Currently **${summary.totalCriticalItems} products are at critical risk** (out of stock or <7 days left).
* Estimated working capital required for 30-day replenishment: **৳${summary.totalSuggestedRestockCost.toLocaleString()}**.

**2. Priority Reorder Recommendations:**
${
  summary.urgentRestockProducts.length > 0
    ? summary.urgentRestockProducts
        .slice(0, 4)
        .map(
          (p) =>
            `* **${p.product.name}**: Stock ${p.currentStock} units, 30-day forecast ${p.demand30Days} units. Recommended reorder: **+${p.suggestedRestockQty} units**. `
        )
        .join('\n')
    : '* All core inventory lines have sufficient stock cover.'
}

**3. Working Capital Strategy:**
* **Prioritize High-Velocity Lines**: Focus restock capital on top moving fast-turnover items to prevent revenue drop.
* **Liquidate Dead Stock**: ${summary.overstockedProducts.length} items show no sales in 90 days. Run promotional offers to release tied-up liquidity.`;
  }
}

/**
 * Single product deep-dive Gemini AI strategy
 */
export async function generateProductDemandInsight(
  item: ProductDemandForecast,
  language: 'en' | 'bn' = 'bn'
): Promise<string> {
  const prompt = `
Analyze product inventory demand velocity for ERP shop management:
Product: ${item.product.name}
SKU: ${item.product.sku}
Purchase Price: ৳${item.product.purchasePrice}, Sales Price: ৳${item.product.salesPrice}
Current Stock: ${item.product.stock}
Sales Last 90 Days: ${item.totalSold90Days} units (Month 1: ${item.month1Sold}, Month 2: ${item.month2Sold}, Month 3: ${item.month3Sold})
Monthly Velocity: ${item.monthlyVelocity.toFixed(1)} units/month
Daily Velocity: ${item.dailyVelocity.toFixed(2)} units/day
Days of Stock Remaining: ${item.daysRemaining} days
30-Day Predicted Demand: ${item.demand30Days} units
Suggested Reorder Quantity: +${item.suggestedRestockQty} units

Provide a short 3-sentence actionable supply chain recommendation in ${
    language === 'bn' ? 'Bengali' : 'English'
  }.
`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('[Gemini AI Single Product Request Error]:', err);
    }
  }

  if (language === 'bn') {
    return item.aiRecommendationBn;
  }
  return item.aiRecommendationEn;
}
