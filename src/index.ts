import { chromium } from 'playwright';
import { fillInputWithVerification } from './utils';
import { fetchOrders } from './scraper';
import { askQuestion, closeInput } from './input';
import { LOGIN_URL, ORDER_URL } from './constants';

if (!LOGIN_URL) {
  console.error('LOGIN_URL is missing in .env file');
  process.exit(1);
}

async function login(page: any, username: string, password: string): Promise<boolean> {
  try {
    await page.goto(LOGIN_URL);

    await page.waitForSelector('#ap_email_login, #ap_email', { state: 'visible', timeout: 30000 });
    await fillInputWithVerification(page, '#ap_email_login, #ap_email', username);
    await page.click('#continue');

    await page.waitForSelector('#ap_password', { state: 'visible', timeout: 30000 });
    await fillInputWithVerification(page, '#ap_password', password);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('#signInSubmit'),
    ]);

    console.log('Login successful. Please handle OTP manually if prompted.');

    // Handle OTP/MFA
    const otpFieldSelector = 'input[name="otpCode"], input[id="auth-mfa-otpcode"]';
    const isOTPVisible = await page.waitForSelector(otpFieldSelector, { state: 'visible', timeout: 10000 }).catch(() => null);

    if (isOTPVisible) {
      console.log('OTP is required. Please enter the OTP manually on the browser.');

      let timeLeft = 120;
      while (timeLeft > 0) {
        const isOtpSubmitted = await page.evaluate(() => {
          const input = document.querySelector('input[name="otpCode"], input[id="auth-mfa-otpcode"]') as HTMLInputElement | null;
          return input ? input.value.trim().length > 0 : false;
        });

        if (isOtpSubmitted) {
          console.log('OTP submitted successfully.');
          break;
        }

        console.log(`Waiting for OTP submission... (${timeLeft}s left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        timeLeft--;
      }

      if (timeLeft === 0) {
        console.log('OTP was not submitted within the time limit. Please try again.');
        return false;
      }
    }

    const isLoginSuccessful = await page.waitForSelector('#nav-orders, #nav-link-accountList', { state: 'visible', timeout: 10000 }).catch(() => null);
    return !!isLoginSuccessful;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

async function main() {
  try {
    const username = await askQuestion('Enter your Amazon email or phone number: ');
    const password = await askQuestion('Enter your Amazon password: ', true);

    closeInput();

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const isLoggedIn = await login(page, username, password);
    if (!isLoggedIn) {
      console.error('Login failed. Please check your credentials or complete any manual verification.');
      await browser.close();
      return;
    }

    console.log('Login successful.');

    // Fetch orders
    const orders = await fetchOrders(page, ORDER_URL, async () => await login(page, username, password));
    console.log('Fetched Orders:', JSON.stringify(orders, null, 2));

    let orderArray = [];
    for (const order of orders) {
      if (order.link) {
        try {
          console.log(`Visiting order: ${order.link}`);
          await page.goto(order.link);

          const productPrice = await page.textContent('.a-price-whole, .a-color-price').catch(() => 'Unknown');
          const productLink = await page.url();

          orderArray.push({ name: order.name, productPrice, productLink });
        } catch (error) {
          console.error(`Failed to fetch details for order: ${order.link}`, error);
        }
      }
    }

    console.log(orderArray);
  } catch (error) {
    console.error('Error:', error);
    closeInput();
  }
}

main();
