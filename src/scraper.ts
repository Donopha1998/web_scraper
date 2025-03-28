import { Page } from 'playwright';

export async function fetchOrders(page: Page, orderUrl: string, reLogin: () => Promise<boolean>): Promise<any[]> {
  try {
    await page.goto(orderUrl);

    // Check if redirected to the login page
    if (page.url().includes('signin')) {
      console.log('Detected login page during fetchOrders. Attempting re-login...');
      const loginSuccess = await reLogin();
      if (!loginSuccess) {
        console.error('Re-login failed. Cannot fetch orders.');
        return [];
      }
      await page.goto(orderUrl);
    }

    await page.waitForSelector('.a-fixed-left-grid-col.a-col-right', { timeout: 30000 });

    // Extract order details
    const orders = await page.evaluate(() => {
      const orderElements = document.querySelectorAll('.a-fixed-left-grid-col.a-col-right');
      const orderList: any[] = [];

      orderElements.forEach(orderElement => {
        const productLinkElement = orderElement.querySelector('.yohtmlc-product-title a');
        const productName = productLinkElement?.textContent?.trim() || 'Unknown';
        const productLink = productLinkElement?.getAttribute('href') || '#';

        orderList.push({
          name: productName,
          link: productLink.startsWith('http') ? productLink : `https://www.amazon.in${productLink}`
        });
      });

      return orderList;
    });

    console.log(`Total Orders Found: ${orders.length}`);
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}
