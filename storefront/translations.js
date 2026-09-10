/* ─────────────────────────────────────────────────────────────
   Peter1947 — storefront i18n (EN / TH)
   Terse, terminal voice. Elements opt in with data-i18n="key".
   ───────────────────────────────────────────────────────────── */
const translations = {
    en: {
        /* nav */
        nav_paths: "courses",
        nav_trial: "free-trial",
        nav_curriculum: "curriculum",
        nav_pricing: "pricing",
        nav_faq: "faq",
        nav_login: "login",

        /* hero */
        hero_cmd: "peter1947:~$ ./academy --enroll",
        hero_title_1: "MASTER YOUR BODY.",
        hero_title_2: "MASTER ROBOTICS.",
        hero_sub: "Two disciplines. One method: small, measured progressions — until the rep, or the robot, works. Built by an engineer who trains.",
        hero_btn_trial: "start free lesson",
        hero_btn_courses: "browse courses",
        hero_stat_students: "students",
        hero_stat_lessons: "lessons",
        hero_stat_rating: "avg rating",

        /* system / marquee */
        sys_label: "// stack",

        /* paths */
        paths_tag: "// courses",
        paths_title: "Choose a path.",
        paths_sub: "Same philosophy on both tracks. Different hardware.",
        path_cal_name: "calisthenics",
        path_cal_line: "\"own your bodyweight.\"",
        path_cal_desc: "Push-ups to planche. Dead hang to muscle-up. A 12-week progressive system with a fallback for every step.",
        path_rob_name: "robotics",
        path_rob_line: "\"from a blink to a rover.\"",
        path_rob_desc: "Electronics, Python, C++, ROS. Every module ends with working hardware. Capstone: an autonomous rover you built.",
        path_open: "open track",

        /* trial */
        trial_tag: "// free-trial",
        trial_title: "Run a real lesson. No card.",
        trial_sub: "A full lesson from each track. Progress is saved locally. Unlock the rest whenever.",
        trial_cal_title: "calisthenics/02_pull-ups",
        trial_cal_desc: "Dead hang → scapular pulls → negatives → first clean rep. Plus a 3-week plan.",
        trial_rob_title: "robotics/01_first-circuit",
        trial_rob_desc: "Ohm's law → breadboard → blink, line by line → debugging → your challenge.",
        trial_start: "> start lesson",
        trial_academy_note: "peter1947:~$ # want more — a free account unlocks a full starter module",
        trial_academy_btn: "open academy",

        /* curriculum */
        curr_tag: "// curriculum",
        curr_title: "What's in the box.",
        curr_cal: "calisthenics/",
        curr_rob: "robotics/",

        /* pricing */
        price_tag: "// pricing",
        price_title: "One payment. Kept forever.",
        price_sub: "No subscription. Every future update included.",
        price_popular: "best value",
        price_cal_name: "calisthenics",
        price_rob_name: "robotics",
        price_bundle_name: "both tracks",
        price_per: "// one-time",
        price_buy: "> get access",
        price_guarantee: "peter1947:~$ # 14-day refund, no questions asked",

        /* testimonials */
        tst_tag: "// results",
        tst_title: "People who finished.",

        /* faq */
        faq_tag: "// faq",
        faq_title: "Questions.",

        /* cta */
        cta_cmd: "peter1947:~$ ./start --now",
        cta_title: "Your first rep starts tonight.",
        cta_sub: "Take the free lesson. Decide about the rest later.",
        cta_btn: "> run free lesson",

        /* footer */
        foot_tag: "master your body. master robotics.",
        foot_rights: "all rights reserved.",

        buy_now: "> buy",
    },

    th: {
        nav_paths: "คอร์ส",
        nav_trial: "ทดลองฟรี",
        nav_curriculum: "หลักสูตร",
        nav_pricing: "ราคา",
        nav_faq: "คำถาม",
        nav_login: "เข้าสู่ระบบ",

        hero_cmd: "peter1947:~$ ./academy --enroll",
        hero_title_1: "ควบคุมร่างกายคุณ",
        hero_title_2: "ควบคุมหุ่นยนต์",
        hero_sub: "สองศาสตร์ หนึ่งวิธีการ: ก้าวหน้าทีละเล็กที่วัดผลได้ จนกว่าจะทำท่าได้ หรือหุ่นยนต์ทำงาน สร้างโดยวิศวกรที่ฝึกจริง",
        hero_btn_trial: "เริ่มบทเรียนฟรี",
        hero_btn_courses: "ดูคอร์สทั้งหมด",
        hero_stat_students: "นักเรียน",
        hero_stat_lessons: "บทเรียน",
        hero_stat_rating: "คะแนนเฉลี่ย",

        sys_label: "// สแตก",

        paths_tag: "// คอร์ส",
        paths_title: "เลือกเส้นทาง",
        paths_sub: "แนวคิดเดียวกันทั้งสองเส้นทาง ต่างกันที่ฮาร์ดแวร์",
        path_cal_name: "คาลิสเทนิกส์",
        path_cal_line: "\"ควบคุมน้ำหนักตัวคุณ\"",
        path_cal_desc: "วิดพื้นถึงแพลนช์ ห้อยบาร์ถึงมัสเซิลอัพ ระบบ 12 สัปดาห์ พร้อมทางเลือกสำรองทุกขั้น",
        path_rob_name: "หุ่นยนต์",
        path_rob_line: "\"จากไฟกะพริบสู่โรเวอร์\"",
        path_rob_desc: "อิเล็กทรอนิกส์ Python C++ ROS ทุกโมดูลจบด้วยฮาร์ดแวร์ที่ใช้งานได้ ปลายทาง: โรเวอร์อัตโนมัติที่คุณสร้างเอง",
        path_open: "เปิดเส้นทาง",

        trial_tag: "// ทดลองฟรี",
        trial_title: "ลองเรียนบทเรียนจริง ไม่ต้องใช้บัตร",
        trial_sub: "บทเรียนเต็มจากแต่ละเส้นทาง ความก้าวหน้าถูกบันทึกในเครื่อง ปลดล็อกส่วนที่เหลือเมื่อพร้อม",
        trial_cal_title: "calisthenics/02_pull-ups",
        trial_cal_desc: "ห้อยบาร์ → สแคปปูลาร์พูล → เนกาทีฟ → ดึงข้อครั้งแรก พร้อมแผน 3 สัปดาห์",
        trial_rob_title: "robotics/01_first-circuit",
        trial_rob_desc: "กฎของโอห์ม → เบรดบอร์ด → โค้ด blink ทีละบรรทัด → แก้บั๊ก → โจทย์ของคุณ",
        trial_start: "> เริ่มบทเรียน",
        trial_academy_note: "peter1947:~$ # ต้องการมากกว่านี้ — บัญชีฟรีปลดล็อกโมดูลเริ่มต้นเต็ม",
        trial_academy_btn: "เปิดสถาบัน",

        curr_tag: "// หลักสูตร",
        curr_title: "มีอะไรในกล่อง",
        curr_cal: "calisthenics/",
        curr_rob: "robotics/",

        price_tag: "// ราคา",
        price_title: "จ่ายครั้งเดียว เก็บไว้ตลอดไป",
        price_sub: "ไม่มีค่าสมาชิกรายเดือน รวมอัปเดตในอนาคตทั้งหมด",
        price_popular: "คุ้มที่สุด",
        price_cal_name: "คาลิสเทนิกส์",
        price_rob_name: "หุ่นยนต์",
        price_bundle_name: "ทั้งสองเส้นทาง",
        price_per: "// จ่ายครั้งเดียว",
        price_buy: "> รับสิทธิ์",
        price_guarantee: "peter1947:~$ # คืนเงินภายใน 14 วัน ไม่มีเงื่อนไข",

        tst_tag: "// ผลลัพธ์",
        tst_title: "คนที่เรียนจบ",

        faq_tag: "// คำถาม",
        faq_title: "คำถาม",

        cta_cmd: "peter1947:~$ ./start --now",
        cta_title: "เรพแรกของคุณเริ่มคืนนี้",
        cta_sub: "เรียนบทเรียนฟรี แล้วค่อยตัดสินใจเรื่องที่เหลือ",
        cta_btn: "> รันบทเรียนฟรี",

        foot_tag: "ควบคุมร่างกายคุณ ควบคุมหุ่นยนต์",
        foot_rights: "สงวนลิขสิทธิ์",

        buy_now: "> ซื้อ",
    },
};
