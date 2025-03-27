import { Page } from 'playwright';

export async function fetchOrders(page: Page, orderUrl: string): Promise<any[]> {
  try {
    await page.goto(orderUrl);

    await page.waitForSelector('.a-fixed-left-grid-col.a-col-right');

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
          link: `https://www.amazon.in${productLink}`
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
