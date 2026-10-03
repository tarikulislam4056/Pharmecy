# DokanPro Enterprise ERP - হোস্টিং ও লোকালহোস্ট গাইড (Hosting & Localhost Deployment Guide)

**ডেভেলপার পরিচিতি (Developer Details):**
- **Developer:** Md. Tarikul Islam
- **Phone:** 01312305225
- **Address:** Sherpur, Sadar, Sherpur

---

## 🌟 ১. কিভাবে cPanel / Shared Hosting / VPS-এ ইনস্টল করবেন:

### ধাপ ১: ফাইল আপলোড
1. সফটওয়্যার বিল্ড করার পর তৈরি হওয়া `dist` ফোল্ডারের সমস্ত ফাইল আপনার cPanel-এর `public_html` ফোল্ডারে আপলোড করুন (অথবা আপনার সাব-ডোমেইনে)।
2. রুট ফোল্ডারে থাকা `api.php` এবং `database.sql` ফাইলটিও আপলোড করুন।

### ধাপ ২: ডাটাবেস তৈরি ও SQL ফাইল ইমপোর্ট (phpMyAdmin)
1. cPanel থেকে **MySQL Database Wizard**-এ গিয়ে নতুন ডাটাবেস ও ইউজার তৈরি করুন (যেমন: `dokanpro_db`)।
2. **phpMyAdmin** ওপেন করে আপনার ডাটাবেস সিলেক্ট করুন।
3. **Import** ট্যাবে গিয়ে সফটওয়্যার থেকে ডাউনলোড করা `dokanpro_database.sql` অথবা সফটওয়্যার রোডের `database.sql` ফাইলটি সিলেক্ট করে **Go/Import** বাটনে চাপ দিন। সমস্ত টেবিল ও ডাটা স্বয়ংক্রিয়ভাবে তৈরি হয়ে যাবে।

### ধাপ ৩: api.php কনফিগারেশন (প্রয়োজন হলে)
`api.php` ফাইলটি এডিট করে ডাটাবেসের ইউজারনেম ও পাসওয়ার্ড দিন:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'your_cpanel_db_user');
define('DB_PASS', 'your_cpanel_db_password');
define('DB_NAME', 'your_cpanel_db_name');
```

---

## 💻 ২. কিভাবে Localhost (XAMPP / Laragon / WAMP)-এ চালাবেন:

1. **XAMPP** ওপেন করে **Apache** এবং **MySQL** Start করুন।
2. ব্রাউজারে `http://localhost/phpmyadmin` ওপেন করুন।
3. নতুন ডাটাবেস তৈরি করুন: `dokanpro_erp_db`
4. **Import** ট্যাবে গিয়ে `database.sql` ফাইলটি সিলেক্ট করে ইমপোর্ট দিন।
5. এই প্রজেক্ট ফোল্ডারটি `htdocs` ফোল্ডারে রাখুন অথবা সরাসরি React/Node দিয়ে রান করুন।

---

## ⚡ ৩. কিভাবে Node.js / Localhost টার্মিনালে চালাবেন:

1. টার্মিনাল ওপেন করে ডিপেন্ডেন্সি ইনস্টল করুন:
   ```bash
   npm install
   ```
2. অ্যাপ্লিকেশন বিল্ড করুন:
   ```bash
   npm run build
   ```
3. লোকালহোস্ট সার্ভার স্টার্ট করুন:
   ```bash
   npm start
   ```
4. ব্রাউজারে যান: `http://localhost:3000`

---

## 💾 ৪. সফটওয়্যার থেকে সরাসরি ১-ক্লিকে SQL ফাইল ডাউনলোড:

- সফটওয়্যারের **Settings (সেটিংস) ➔ Database & SQL Backup (ডাটাবেস ও এসকিউএল ব্যাকআপ)** ট্যাবে যান।
- **"সম্পূর্ণ ডাটাবেস ব্যাকআপ (.sql ফাইল) ডাউনলোড করুন"** বাটনে চাপ দিন।
- তৎক্ষণাৎ আপনার সমস্ত কাস্টমার, প্রোডাক্ট, ক্যাশ, বাকি ও বিক্রির ডাটা সহ ফুল MySQL/MariaDB ফাইল ডাউনলোড হয়ে যাবে।
