async function testLogins() {
  const users = [
    { role: "manager", login: "owner", password: "mesob1234" },
    { role: "admin", login: "admin1", password: "mesob1234" },
    { role: "kitchen", login: "chef", password: "mesob1234" },
    { role: "waiter (selam)", login: "selam", password: "mesob1234" },
    { role: "waiter (dawit)", login: "dawit", password: "mesob1234" },
    { role: "inventory", login: "yonas", password: "mesob1234" },
    { role: "cleaner", login: "tigist", password: "mesob1234" },
    { role: "security", login: "robel", password: "mesob1234" },
  ];

  console.log("Testing POST /api/v1/auth/login for all roles...");
  let allPassed = true;

  for (const u of users) {
    try {
      const res = await fetch("http://localhost:4000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: u.login, password: u.password }),
      });
      const data = await res.json();
      if (res.status === 200 && data.status === "ok") {
        console.log(`[PASS] ${u.role.padEnd(16)} (user: ${u.login}) -> Status: ${res.status}, role in DB: ${data.user?.role}`);
      } else {
        console.error(`[FAIL] ${u.role.padEnd(16)} (user: ${u.login}) -> Status: ${res.status}, Response:`, data);
        allPassed = false;
      }
    } catch (e: any) {
      console.error(`[ERROR] ${u.role.padEnd(16)} (user: ${u.login}) -> Connection error:`, e.message);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("\nALL 8 ROLES LOGGED IN SUCCESSFULLY WITH HTTP 200 OK!");
  } else {
    console.log("\nSOME LOGINS FAILED!");
  }
}

testLogins();
