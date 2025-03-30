import { chromium } from 'playwright';
import { fillInputWithVerification } from './utils';
import { fetchOrders } from './scraper';
import { askQuestion, closeInput, intValidationQuestion } from './input';
import { LOGIN_URL, ORDER_URL } from './constants';
import * as fs from 'fs';
import { searchAmazon } from './search';

let isLoggedInState = false;
let savedUsername = '';
let savedPassword = '';

if (!LOGIN_URL) {
  console.error('LOGIN_URL is missing in .env file');
  process.exit(1);
}

async function login(page: any): Promise<boolean> {
  try {
    if (isLoggedInState) {
      console.log('User already logged in.');
      return true;
    }

    const isLoggedIn = await page.evaluate(() => !!document.querySelector('#nav-orders, #nav-link-accountList'));

    if (isLoggedIn) {
      console.log('User is already logged in.');
      isLoggedInState = true;
      return true;
    }

    if (!savedUsername || !savedPassword) {
      savedUsername = await askQuestion('Enter your Amazon email or phone number: ');
      savedPassword = await askQuestion('Enter your Amazon password: ', true);
    }

    await page.goto(LOGIN_URL);

    console.log('Login successful. Please handle OTP manually if prompted.');

    const isEmailPrefilled = await page.evaluate(() => {
      const emailInput = document.querySelector('#ap_email_login, #ap_email') as HTMLInputElement | null;
      return emailInput && emailInput.value.trim().length > 0;
    });

    if (!isEmailPrefilled) {
      await page.waitForSelector('#ap_email_login, #ap_email', { state: 'visible', timeout: 30000 });
      await fillInputWithVerification(page, '#ap_email_login, #ap_email', savedUsername);
      await page.click('#continue');
    }

    await page.waitForSelector('#ap_password', { state: 'visible', timeout: 30000 });
    await fillInputWithVerification(page, '#ap_password', savedPassword);

  await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('#signInSubmit'),
    ]);

 

    console.log('Login successful. Please handle OTP manually if prompted.');

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
    const userDataDir = './user-data';

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir);
    }

    const browserContext = await chromium.launchPersistentContext(userDataDir, { headless: false });
    console.log('Using persistent browser context with user data.');
    const page = await browserContext.newPage();

    const choice = await askQuestion('Would you like to (1) View your orders or (2) Search for products? Enter 1 or 2: ');

    if (choice === '1') 
      {
        const ordersCount = await intValidationQuestion('How many last orders you want to crawl: ');


        const orders = await fetchOrders(page, ORDER_URL, async () => await login(page),ordersCount);
        console.log('Fetched Orders:', JSON.stringify(orders, null, 2));
     
    } else if (choice === '2') {
      const searchString = await askQuestion('Enter your search string: ');
      console.log('Select a filter:');
      console.log('1. Price: Low to High');
      console.log('2. Price: High to Low');
      console.log('3. Avg. Customer Reviews');
      console.log('4. Newest Arrivals');
      console.log('5. Best Sellers');
      const filterChoice:number = await intValidationQuestion('Enter the number of your filter choice: ');

      if(filterChoice > 5) return  console.log('Invalid choice. Please enter the correct value.');

      const filterOptions = ['Price: Low to High', 'Price: High to Low', 'Avg. Customer Reviews', 'Newest Arrivals', 'Best Sellers'];
      const filterOption = filterOptions[filterChoice - 1] || 'Price: Low to High';

      await searchAmazon(page, searchString, filterOption);
    } else {
      console.log('Invalid choice. Please enter 1 or 2.');
    }
  } catch (error) {
    console.error('Error:', error);
    closeInput();
  }
}

main();
