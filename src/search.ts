import { chromium } from 'playwright';

export async function searchAmazon(page: any, searchString: string, filterOption: string) {
  try {
    console.log(`Searching for: ${searchString} with filter: ${filterOption}`);
    await page.goto('https://www.amazon.in/');

    await page.fill('#twotabsearchtextbox', searchString);
    await page.click('#nav-search-submit-button');

    const filterUrls: Record<string, string> = {
      'Price: Low to High': '&s=price-asc-rank',
      'Price: High to Low': '&s=price-desc-rank',
      'Avg. Customer Reviews': '&s=review-rank',
      'Newest Arrivals': '&s=date-desc-rank',
      'Best Sellers': '&s=salesrank'
    };

    if (filterOption in filterUrls) {
      const filterUrl = filterUrls[filterOption];
      const currentUrl = page.url();
      await page.goto(`${currentUrl}${filterUrl}`);
    }

    await page.waitForTimeout(3000);

    const sections = await page.$$('.s-main-slot div[data-component-type="s-search-result"]');
    const resultsArray: any[] = [];

    for (const section of sections) {
      const nameElement = await section.$('.a-size-medium.a-spacing-none.a-color-base.a-text-normal');
      const priceElement = await section.$('.a-price-symbol + .a-price-whole, .a-color-price') || await section.$('a-color-base');
      const fractionElement = await section.$('span.a-price-fraction');
      const linkElement = await section.$('a.a-link-normal');
      

      if (!nameElement || !linkElement) continue;



      const name = await nameElement.textContent() || 'Unknown';
      const priceWhole = priceElement ? (await priceElement.textContent() || 'Not Found') : 'Not Found';
      const priceFraction = fractionElement ? (await fractionElement.textContent() || '') : '';
      const price = `${priceWhole}${priceFraction}`.trim();
      const link = `https://www.amazon.in${await linkElement.getAttribute('href')}`;

      resultsArray.push({ name: name.trim(), price, link });
    }

    if (resultsArray.length === 0) {
      console.log('No results found. Please try again with a different search.');
    } else {
      console.log('Search Results:', resultsArray);
      return resultsArray;
    }
  } catch (error) {
    console.error('Error during search:', error);
  }
}
