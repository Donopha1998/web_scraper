import { Page } from 'playwright';

export async function fillInputWithVerification(page: Page, selector: string, value: string) {
  try {
    const inputField = await page.waitForSelector(selector, {  timeout: 10000 });
    await inputField.click({ clickCount: 3 });
    await inputField.type(value, { delay: 100 });

    const currentValue = await inputField.inputValue();
    if (currentValue !== value) {
      await inputField.click({ clickCount: 3 });
      await inputField.type(value, { delay: 100 });
    }
  } catch (error) {
    console.error(`Failed to enter value:`, error);
  }
}
