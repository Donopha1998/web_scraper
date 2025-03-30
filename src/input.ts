import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export function askQuestion(query: string, isPassword = false): Promise<string> {
  return new Promise((resolve) => {
    if (isPassword) {
      const stdin = process.stdin;
      stdin.resume();
      stdin.setRawMode(true);
      stdin.setEncoding('utf8');

      let password = '';
      console.log(query);

      stdin.on('data', (data) => {
        const char = data.toString();
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          console.log('\n');
          resolve(password);
        } else if (char === '\u0003') {
          console.log('Process exited');
          process.exit();
        } else {
          password += char;
          process.stdout.write('*'); 
        }
      });
    } else {
      rl.question(query, (answer) => resolve(answer));
    }
  });
}

export function closeInput(): void {
  rl.close();
}



export function intValidationQuestion(question: string): Promise<number> {
  return new Promise((resolve, reject) => {
    rl.question(question, (answer) => {
      const parsedAnswer = parseInt(answer, 10);
      if (isNaN(parsedAnswer) || parsedAnswer <= 0) {
        reject(new Error('Invalid input. Please enter a valid integer greater than 0.'));
      } else {
        resolve(parsedAnswer);
      }
    });
  });
}