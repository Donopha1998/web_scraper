import { Page, chromium } from 'playwright';
import * as fs from 'fs';
import { Cluster } from 'playwright-cluster';


const currentYear = new Date().getFullYear();
const timeFilters = ['last30', 'months-3', ...Array.from({ length: currentYear - 2014 }, (_, i) => `year-${currentYear - i}`), 'archived'];


export async function fetchOrders(page: Page, orderUrl: string, reLogin: () => Promise<boolean>, maxOrders: number): Promise<any[]> {
  try {
    await page.goto(orderUrl);

    if (page.url().includes('signin')) {
      console.log('Detected login page during fetchOrders. Attempting re-login...');
      const loginSuccess = await reLogin();
      if (!loginSuccess) {
        console.error('Re-login failed. Cannot fetch orders.');
        return [];
      }
      await page.goto(orderUrl);
    }

    await page.waitForSelector('.product-image, .product-grid-image', { timeout: 30000 });
    const orderMap = new Map<string, any>();

    for (const filter of timeFilters) {
      console.log(`Applying time filter: ${filter}`);
      const filterApplied = await applyTimeFilter(page, filter);
      if (filterApplied) {
        await scrapeOrdersPage(page, orderMap, maxOrders);
      }
      if (orderMap.size >= maxOrders) break;
    }

    const orderArray = await fetchOrderDetails(page,Array.from(orderMap.values()));

    console.log(`Total Orders Found: ${orderArray.length}`);
    return orderArray;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

async function scrapePage(page: Page, orderMap: Map<string, any>, maxOrders: number) {
  const orderElements = await page.$$('.product-image, .product-grid-image');

  for (const orderElement of orderElements) {
    const productLinkElement = await orderElement.$('a.a-link-normal');
    const productImageElement = await orderElement.$('img');

    if (!productImageElement) continue;

    const productName = await productImageElement.getAttribute('alt') || 'Unknown';

    if (productName.includes('hfc-product-image')) continue;

    const productLink = productLinkElement 
      ? await productLinkElement.getAttribute('href') || '#'
      : '#';

    const fullProductLink = productLink.startsWith('http') ? productLink : `https://www.amazon.in${productLink}`;

    if (!orderMap.has(fullProductLink)) {
      orderMap.set(fullProductLink, { name: productName, link: fullProductLink });
    }

    if (orderMap.size >= maxOrders) return;
  }
}

async function scrapeOrdersPage(page: Page, orderMap: Map<string, any>, maxOrders: number) {
  while (orderMap.size < maxOrders) {
    await scrapePage(page, orderMap, maxOrders);

    if (orderMap.size < maxOrders) {
      const nextButton = await page.$('li.a-last a');
      if (!nextButton) {
        console.log('No more pages available.');
        break;
      }

      const nextPageUrl = await nextButton.getAttribute('href');
      if (nextPageUrl) {
        console.log('Going to the next page...');
        await page.goto(`https://www.amazon.in${nextPageUrl}`);
      }
    }
  }
}


async function applyTimeFilter(page: Page, filterValue: string): Promise<boolean> {
  try {
    const selectElement = await page.$('select#time-filter');
    if (selectElement) {
      await selectElement.selectOption({ value: filterValue });
      await page.waitForTimeout(3000);
      console.log(`Filter applied: ${filterValue}`);
      return true;
    } else {
      console.log(`Filter not found: ${filterValue}`);
    }
  } catch (error) {
    console.error(`Error applying filter: ${filterValue}`, error);
  }
  return false;
}

async function fetchOrderDetails(page:any,orders: any[]): Promise<any[]> {
  const orderResults: any[] = [];

  for (const order of orders) {
    try {
      console.log(`Visiting order: ${order.link}`);
      await page.goto(order.link);

      await page.waitForFunction(() => {
        const element = document.querySelector('span.a-price-whole');
        return element && window.getComputedStyle(element).display !== 'none';
      });


      fs.writeFileSync('new_one.html',await page.content())

     const productPriceWhole = await page.textContent('.a-price-whole, .a-color-price').catch(() => 'Unknown');
     const productPriceFraction = await page.textContent('.a-price-fraction').catch(() => '00');
     const productPrice = `${productPriceWhole}${productPriceFraction}`.trim() || 'Unknown';

      const productLink = await page.url();

      console.log({ name: order.name, productPrice, productLink })

      orderResults.push({ name: order.name, productPrice, productLink });
    } catch (error) {
      console.error(`Failed to fetch details for order: ${order.link}`, error);
    } 
  }

  return orderResults;
}



async function safeGoto(page: Page, url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'load' });
      console.log(`Navigated to: ${url}`);
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed to navigate to ${url}:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
