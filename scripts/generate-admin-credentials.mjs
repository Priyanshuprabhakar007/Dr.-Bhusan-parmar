import crypto from 'node:crypto';
import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter admin email: ', (email) => {
  rl.question('Enter admin name: ', (name) => {
    rl.question('Enter admin password: ', (password) => {
      if (!password || password.length < 8) {
        console.error('Error: Password must be at least 8 characters long.');
        rl.close();
        process.exit(1);
      }

const PASSWORD_PBKDF2_ITERATIONS = 100000;

      const salt = crypto.randomBytes(16).toString('hex');
      crypto.pbkdf2(password, salt, PASSWORD_PBKDF2_ITERATIONS, 32, 'sha256', (err, derivedKey) => {
        if (err) {
          console.error('Error generating hash:', err);
          rl.close();
          process.exit(1);
        }

        const passwordHash = derivedKey.toString('hex');
        const adminId = 'admin-' + crypto.randomUUID().slice(0, 8);

        console.log('\n--- Admin Credentials Generated Successfully ---');
        console.log(`Email: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Salt: ${salt}`);
        console.log(`Hash: [REDACTED FOR SECURITY]`);
        console.log('\n--- SQL Instructions for D1 ---');
        console.log(`INSERT INTO admin_users\n(id, email, name, role, password_hash, salt, status)\nVALUES\n('${adminId}', '${email}', '${name}', 'super_admin', '${passwordHash}', '${salt}', 'active');`);
        console.log('--------------------------------------------------\n');

        rl.close();
      });
    });
  });
});
