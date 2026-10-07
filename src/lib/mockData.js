// Seed data for the restaurant management system UI. Loaded once by
// `DataContext` into localStorage; pages read the store, never this file.
// Billing maths lives in `format.js`, role metadata in `roles.js`.

export const restaurant = {
  name: "Mesob House",
  tagline: "Kitchen & Dining Operations",
  address: "Bole Road, Addis Ababa",
  phone: "+251 11 552 0099",
  email: "hello@mesobhouse.et",
  tin: "ER1234567890",
  footer: "Thank you for dining with us. This is a system-generated tax invoice.",
  taxRate: 15,
  serviceCharge: 10,
  closingTime: "04:00",
  currency: "ETB",
  reservationDuration: 90,
  noShowGrace: 15,
  reminderLead: 30,
  delayThreshold: 20,
  warrantyLead: 30,
  varianceThreshold: 10,
  notificationRetention: 30,
  inventoryTracking: true,
  orderPrefix: "ORD-",
  orderDigits: 4,
  invoicePrefix: "INV-",
  creditNotePrefix: "CN-",
};

export const tables = [
  { id: "T01", number: "1", seats: 2, section: "Window", status: "Available", order: null, reservation: null },
  { id: "T02", number: "2", seats: 2, section: "Window", status: "Occupied", order: "ORD-0042", waiter: "Selam T.", reservation: null },
  { id: "T03", number: "3", seats: 4, section: "Window", status: "Cleaning", order: null, reservation: null },
  { id: "T04", number: "4", seats: 4, section: "Main Hall", status: "Available", order: null, reservation: null },
  { id: "T05", number: "5", seats: 4, section: "Main Hall", status: "Occupied", order: "ORD-0043", waiter: "Dawit M.", reservation: null },
  { id: "T06", number: "6", seats: 6, section: "Main Hall", status: "Reserved", order: null, reservation: "Bekele family" },
  { id: "T07", number: "7", seats: 6, section: "Main Hall", status: "Available", order: null, reservation: null },
  { id: "T08", number: "8", seats: 2, section: "Patio", status: "Out of Service", order: null, reservation: null },
  { id: "T09", number: "9", seats: 4, section: "Patio", status: "Available", order: null, reservation: null },
  { id: "T10", number: "10", seats: 8, section: "Patio", status: "Occupied", order: "ORD-0044", waiter: "Selam T.", reservation: null },
  { id: "T11", number: "11", seats: 4, section: "Private", status: "Reserved", order: null, reservation: "Aster T." },
  { id: "T12", number: "12", seats: 10, section: "Private", status: "Available", order: null, reservation: null },
];

export const menuCategories = [
  { id: "C1", name: "Breakfast", order: 1, status: "Active" },
  { id: "C2", name: "Main Dishes", order: 2, status: "Active" },
  { id: "C3", name: "Drinks", order: 3, status: "Active" },
  { id: "C4", name: "Desserts", order: 4, status: "Active" },
  { id: "C5", name: "Coffee", order: 5, status: "Active" },
];

export const menuItems = [
  { id: "M01", name: "Ful Medames", category: "Breakfast", price: 180, status: "Active", availability: "Available", fasting: "Non-fasting", mealPeriod: "Breakfast", image: "/images/menu/ful-medames.svg", variants: [{ name: "Regular", price: 180, multiplier: 1, default: true }, { name: "Large", price: 240, multiplier: 1.4 }], addons: [], hasRecipe: true },
  { id: "M02", name: "Chechebsa", category: "Breakfast", price: 220, status: "Active", availability: "Available", fasting: "Non-fasting", mealPeriod: "Breakfast", image: "/images/menu/chechebsa.svg", variants: [], addons: [{ name: "Extra Spice", price: 20 }], hasRecipe: true },
  { id: "M03", name: "Doro Wot", category: "Main Dishes", price: 480, status: "Active", availability: "Available", fasting: "Non-fasting", mealPeriod: "All day", image: "/images/menu/doro-wot.svg", variants: [{ name: "Single", price: 480, multiplier: 1, default: true }, { name: "Sharing", price: 720, multiplier: 1.6 }], addons: [{ name: "Extra Injera", price: 30 }, { name: "Hard Boiled Egg", price: 40 }], hasRecipe: true },
  { id: "M04", name: "Tibs Special", category: "Main Dishes", price: 520, status: "Active", availability: "Available", fasting: "Non-fasting", mealPeriod: "All day", image: "/images/menu/tibs-special.svg", variants: [{ name: "Regular", price: 520, multiplier: 1, default: true }, { name: "Large", price: 680, multiplier: 1.4 }], addons: [{ name: "Extra Injera", price: 30 }], hasRecipe: true },
  { id: "M05", name: "Shiro Wot (Fasting)", category: "Main Dishes", price: 320, status: "Active", availability: "Available", fasting: "Fasting", mealPeriod: "All day", image: "/images/menu/shiro-wot.svg", variants: [], addons: [{ name: "Extra Injera", price: 30 }], hasRecipe: true },
  { id: "M06", name: "Kitfo", category: "Main Dishes", price: 680, status: "Active", availability: "Unavailable", fasting: "Non-fasting", mealPeriod: "All day", image: "/images/menu/kitfo.svg", variants: [{ name: "Regular", price: 680, multiplier: 1, default: true }], addons: [], hasRecipe: true },
  { id: "M07", name: "Beyaynetu (Fasting Platter)", category: "Main Dishes", price: 360, status: "Active", availability: "Available", fasting: "Fasting", mealPeriod: "All day", image: "/images/menu/beyaynetu.svg", variants: [], addons: [], hasRecipe: true },
  { id: "M08", name: "Bottled Water", category: "Drinks", price: 60, status: "Active", availability: "Available", fasting: "Fasting", mealPeriod: "All day", image: "/images/menu/bottled-water.svg", variants: [{ name: "500ml", price: 60, multiplier: 1, default: true }, { name: "1L", price: 90, multiplier: 1.5 }], addons: [], hasRecipe: true },
  { id: "M09", name: "Fresh Mango Juice", category: "Drinks", price: 120, status: "Active", availability: "Available", fasting: "Fasting", mealPeriod: "All day", image: "/images/menu/mango-juice.svg", variants: [], addons: [], hasRecipe: true },
  { id: "M10", name: "Sparkling Water", category: "Drinks", price: 80, status: "Inactive", availability: "Available", fasting: "Fasting", mealPeriod: "All day", image: "/images/menu/sparkling-water.svg", variants: [], addons: [], hasRecipe: false },
  { id: "M11", name: "Tiramisu", category: "Desserts", price: 150, status: "Active", availability: "Available", fasting: "Non-fasting", mealPeriod: "All day", image: "/images/menu/tiramisu.svg", variants: [], addons: [], hasRecipe: true },
  { id: "M12", name: "Macchiato", category: "Coffee", price: 70, status: "Active", availability: "Available", fasting: "Fasting", mealPeriod: "All day", image: "/images/menu/macchiato.svg", variants: [{ name: "Single", price: 70, multiplier: 1, default: true }, { name: "Double", price: 110, multiplier: 1.6 }], addons: [{ name: "Extra Shot", price: 25 }], hasRecipe: true },
  { id: "M13", name: "Buna (Ethiopian Coffee)", category: "Coffee", price: 90, status: "Active", availability: "Available", fasting: "Fasting", mealPeriod: "All day", image: "/images/menu/buna.svg", variants: [], addons: [], hasRecipe: true },
];

export const mealPeriods = [
  { name: "Breakfast", start: "06:00", end: "11:00" },
  { name: "Lunch", start: "11:00", end: "15:00" },
  { name: "Dinner", start: "15:00", end: "22:00" },
];

export const recipes = {
  "M01": { instructions: "Soak chickpeas overnight, simmer with cumin and garlic, finish with olive oil and chopped onion.", lines: [{ item: "Chickpeas", qty: 180 }, { item: "Onion", qty: 40 }] },
  "M02": { instructions: "Bake spiced dough in a covered pan until the top browns, brush with berbere butter.", lines: [{ item: "Butter", qty: 25 }, { item: "Awaze", qty: 10 }, { item: "Injera", qty: 1 }] },
  "M03": { instructions: "Slow-cook onion berbere base, add chicken pieces, hard-boiled eggs, simmer 40 min.", lines: [{ item: "Chicken", qty: 250 }, { item: "Onion", qty: 150 }, { item: "Berbere spice", qty: 40 }, { item: "Injera", qty: 2 }] },
  "M04": { instructions: "Sear beef tibs with awaze, rosemary, butter; serve sizzling.", lines: [{ item: "Beef", qty: 220 }, { item: "Awaze", qty: 30 }, { item: "Butter", qty: 20 }, { item: "Injera", qty: 2 }] },
  "M05": { instructions: "Simmer Shiro with berbere and garlic, whisk in berbere butter off the heat.", lines: [{ item: "Chickpeas", qty: 180 }, { item: "Berbere spice", qty: 25 }, { item: "Butter", qty: 15 }, { item: "Injera", qty: 2 }] },
  "M06": { instructions: "Mince beef with awaze, sear in butter, finish with mitmita.", lines: [{ item: "Beef", qty: 200 }, { item: "Awaze", qty: 40 }, { item: "Butter", qty: 30 }, { item: "Injera", qty: 2 }] },
  "M07": { instructions: "Plate injera, fill with fasting stews and vegetable sides.", lines: [{ item: "Injera", qty: 2 }, { item: "Onion", qty: 60 }] },
  "M08": { instructions: "Chill and serve in the 500ml bottle.", lines: [{ item: "Bottled Water", qty: 1 }] },
  "M09": { instructions: "Blend fresh mango with water and a little sugar, strain, serve cold.", lines: [{ item: "Mango", qty: 2 }, { item: "Bottled Water", qty: 1 }] },
  "M11": { instructions: "Whisk mascarpone with coffee and cocoa, layer with sponge, chill 4h.", lines: [{ item: "Milk", qty: 120 }, { item: "Coffee beans", qty: 15 }] },
  "M12": { instructions: "Pull single shot, top with steamed milk foam.", lines: [{ item: "Coffee beans", qty: 18 }, { item: "Milk", qty: 80 }] },
  "M13": { instructions: "Pan-toast green coffee beans, grind fresh, brew in a jebena.", lines: [{ item: "Coffee beans", qty: 20 }] },
};

export const orders = [
  {
    id: "ORD-0042", number: "0042", type: "Dine-in", table: "2", waiter: "Selam T.", customer: null, guests: 2,
    status: "Active", created: "19:12", notes: "",
    tickets: [
      { round: 1, status: "Served", submittedAt: "19:13", items: [{ name: "Doro Wot", variant: "Single", qty: 2, price: 480, addons: ["Extra Injera"], note: "" }] },
      { round: 2, status: "Preparing", submittedAt: "19:42", items: [{ name: "Macchiato", variant: "Double", qty: 2, price: 110, addons: [], note: "less sugar" }] },
    ],
    discount: 0, invoice: null,
  },
  {
    id: "ORD-0043", number: "0043", type: "Dine-in", table: "5", waiter: "Dawit M.", customer: "Abebe G.", guests: 3,
    status: "Served", created: "18:40", notes: "Window seat preferred",
    tickets: [{ round: 1, status: "Served", submittedAt: "18:41", items: [{ name: "Tibs Special", variant: "Regular", qty: 2, price: 520, addons: [], note: "" }, { name: "Fresh Mango Juice", variant: "", qty: 3, price: 120, addons: [], note: "" }] }],
    discount: 10, invoice: null,
  },
  {
    id: "ORD-0044", number: "0044", type: "Dine-in", table: "10", waiter: "Selam T.", customer: null, guests: 7,
    status: "Active", created: "19:30", notes: "",
    tickets: [{ round: 1, status: "Submitted", submittedAt: "19:31", items: [{ name: "Beyaynetu (Fasting Platter)", variant: "", qty: 4, price: 360, addons: [], note: "" }, { name: "Doro Wot", variant: "Sharing", qty: 1, price: 720, addons: ["Hard Boiled Egg"], note: "" }] }],
    discount: 0, invoice: null,
  },
  {
    id: "ORD-0045", number: "0045", type: "Takeaway", table: null, waiter: "Dawit M.", customer: "Meron A.", guests: 1,
    status: "Active", created: "19:55", notes: "Pickup at 20:20",
    tickets: [{ round: 1, status: "Ready", submittedAt: "19:56", items: [{ name: "Shiro Wot (Fasting)", variant: "", qty: 2, price: 320, addons: ["Extra Injera"], note: "" }] }],
    discount: 0, invoice: null,
  },
];

export const creditNotes = [];

export const customers = [
  { id: "CU01", name: "Abebe G.", phone: "+251911223344", email: "abebe@example.com", orders: 12, lastVisit: "Today", notes: "Prefers window seat" },
  { id: "CU02", name: "Merone A.", phone: "+251912556677", email: "", orders: 4, lastVisit: "Today", notes: "Takeaway regular" },
  { id: "CU03", name: "Bekele family", phone: "+251913445566", email: "", orders: 2, lastVisit: "3 days ago", notes: "Group of 6, table 6" },
  { id: "CU04", name: "Aster T.", phone: "+251914667788", email: "aster.t@example.com", orders: 8, lastVisit: "Yesterday", notes: "Private room bookings" },
  { id: "CU05", name: "Yonas K.", phone: "+251915889900", email: "", orders: 1, lastVisit: "1 week ago", notes: "" },
];

export const reservations = [
  { id: "R01", customer: "Bekele family", phone: "+251913445566", date: "Today", time: "20:00", guests: 6, tables: ["6"], status: "Confirmed", notes: "Birthday — bring candle" },
  { id: "R02", customer: "Aster T.", phone: "+251914667788", date: "Today", time: "20:30", guests: 4, tables: ["11"], status: "Pending", notes: "Quiet corner" },
  { id: "R03", customer: "Selam Optics", phone: "+251911000111", date: "Today", time: "18:00", guests: 3, tables: ["4"], status: "Completed", notes: "" },
  { id: "R04", customer: "Dawit B.", phone: "+251917222333", date: "Today", time: "17:30", guests: 2, tables: ["1"], status: "No Show", notes: "" },
  { id: "R05", customer: "Hanna M.", phone: "+251918333444", date: "Tomorrow", time: "13:00", guests: 8, tables: ["12"], status: "Confirmed", notes: "Business lunch, merge if needed" },
];

export const inventoryItems = [
  { id: "I01", name: "Chicken", category: "Meat", baseUnit: "g", qty: 12500, min: 8000, reorder: 20000, supplier: "Bole Poultry", status: "OK" },
  { id: "I02", name: "Beef", category: "Meat", baseUnit: "g", qty: 4200, min: 5000, reorder: 15000, supplier: "Atlas Butcher", status: "Low" },
  { id: "I03", name: "Onion", category: "Vegetables", baseUnit: "g", qty: 28000, min: 10000, reorder: 25000, supplier: "Merkato Veg", status: "OK" },
  { id: "I04", name: "Berbere spice", category: "Spices", baseUnit: "g", qty: 1500, min: 2000, reorder: 5000, supplier: "Spice House", status: "Low" },
  { id: "I05", name: "Injera", category: "Dry goods", baseUnit: "pieces", qty: 64, min: 40, reorder: 100, supplier: "Injera House", status: "OK" },
  { id: "I06", name: "Coffee beans", category: "Dry goods", baseUnit: "g", qty: 3200, min: 2000, reorder: 6000, supplier: "Yirgacheffe Coop", status: "OK" },
  { id: "I07", name: "Milk", category: "Dairy", baseUnit: "ml", qty: 1800, min: 3000, reorder: 8000, supplier: "Shola Dairy", status: "Low" },
  { id: "I08", name: "Mango", category: "Vegetables", baseUnit: "pieces", qty: 22, min: 15, reorder: 40, supplier: "Merkato Veg", status: "OK" },
  { id: "I09", name: "Bottled Water", category: "Beverages", baseUnit: "pieces", qty: 8, min: 24, reorder: 96, supplier: "Aqua Addis", status: "Low" },
  { id: "I10", name: "Awaze", category: "Spices", baseUnit: "g", qty: 900, min: 500, reorder: 2000, supplier: "Spice House", status: "OK" },
  { id: "I11", name: "Butter", category: "Dairy", baseUnit: "g", qty: 600, min: 800, reorder: 2000, supplier: "Shola Dairy", status: "Low" },
  { id: "I12", name: "Chickpeas", category: "Dry goods", baseUnit: "g", qty: 4200, min: 2000, reorder: 10000, supplier: "Merkato Veg", status: "OK" },
];

export const stockMovements = [
  { id: "SM01", item: "Chicken", qty: 20000, type: "Purchase receipt", date: "Sep 29 09:10", user: "Inventory", reason: "Receipt PO-0031" },
  { id: "SM02", item: "Chicken", qty: -7500, type: "Sale deduction", date: "Sep 29 19:15", user: "System", reason: "ORD-0042 served" },
  { id: "SM03", item: "Beef", qty: -4400, type: "Sale deduction", date: "Sep 29 18:45", user: "System", reason: "ORD-0043 served" },
  { id: "SM04", item: "Injera", qty: -8, type: "Sale deduction", date: "Sep 29 18:45", user: "System", reason: "ORD-0043 served" },
  { id: "SM05", item: "Berbere spice", qty: -500, type: "Adjustment", date: "Sep 29 16:00", user: "Inventory", reason: "Spillage during prep" },
  { id: "SM06", item: "Bottled Water", qty: 48, type: "Emergency purchase", date: "Sep 29 12:30", user: "Inventory", reason: "Ran out during lunch" },
];

export const suppliers = [
  { id: "S01", name: "Bole Poultry", contact: "Getachew", phone: "+251911234567", email: "sales@bolepoultry.et", items: 2, status: "Active" },
  { id: "S02", name: "Atlas Butcher", contact: "Mahmud", phone: "+251912345678", email: "", items: 1, status: "Active" },
  { id: "S03", name: "Merkato Veg", contact: "Almaz", phone: "+251913456789", email: "almaz@merkato.et", items: 2, status: "Active" },
  { id: "S04", name: "Spice House", contact: "Yohannes", phone: "+251914567890", email: "", items: 2, status: "Active" },
  { id: "S05", name: "Yirgacheffe Coop", contact: "Tadesse", phone: "+251915678901", email: "tadesse@yirg.et", items: 1, status: "Active" },
  { id: "S06", name: "Shola Dairy", contact: "Helen", phone: "+251916789012", email: "", items: 2, status: "Active" },
  { id: "S07", name: "Injera House", contact: "Marta", phone: "+251917890123", email: "orders@injerahouse.et", items: 1, status: "Active" },
  { id: "S08", name: "Aqua Addis", contact: "Bekele", phone: "+251918901234", email: "sales@aquaaddis.et", items: 1, status: "Active" },
];

export const purchases = [
  { id: "PO-0031", supplier: "Bole Poultry", date: "Sep 29", status: "Received", lines: 2, total: 24000, emergency: false },
  { id: "PO-0032", supplier: "Merkato Veg", date: "Sep 29", status: "Approved", lines: 3, total: 8500, emergency: false },
  { id: "PO-0033", supplier: "Shola Dairy", date: "Sep 30", status: "Requested", lines: 2, total: 4200, emergency: false },
  { id: "PO-0034", supplier: "Aqua Addis", date: "Sep 29", status: "Emergency - Received", lines: 1, total: 2400, emergency: true, reviewed: false },
  { id: "PO-0035", supplier: "Spice House", date: "Sep 28", status: "Partially Received", lines: 2, total: 6000, emergency: false },
  { id: "PO-0036", supplier: "Atlas Butcher", date: "Sep 28", status: "Rejected", lines: 1, total: 0, emergency: false, reason: "Price too high" },
];

// Expense ids are EX-prefixed so they never collide with employee E-prefixed ids.
export const expenses = [
  { id: "EX01", category: "Rent", amount: 60000, date: "Sep 01", description: "Monthly restaurant rent", status: "Confirmed", by: "Manager", receipt: false },
  { id: "EX02", category: "Utilities", amount: 8200, date: "Sep 15", description: "Electricity bill", status: "Confirmed", by: "Manager", receipt: true },
  { id: "EX03", category: "Cleaning supplies", amount: 1500, date: "Sep 22", description: "Detergents & wipes", status: "Confirmed", by: "Inventory", receipt: false },
  { id: "EX04", category: "Utilities", amount: 3500, date: "Oct 01", description: "Water bill (auto)", status: "Pending confirmation", by: "System", receipt: false },
  { id: "EX05", category: "Transportation", amount: 900, date: "Sep 28", description: "Supplier pickup fuel", status: "Confirmed", by: "Inventory", receipt: false },
];

export const cleaningTasks = [
  { id: "CL01", area: "Table 3", task: "Clean & reset table", assignee: "Unassigned", due: "Now", status: "Pending", type: "table", source: "Table 3 paid" },
  { id: "CL02", area: "Restrooms", task: "Deep clean restrooms", assignee: "Tigist", due: "21:00", status: "In Progress", type: "recurring", source: "Evening template" },
  { id: "CL03", area: "Kitchen", task: "Floor & surfaces", assignee: "Tigist", due: "22:30", status: "Pending", type: "recurring", source: "Closing template" },
  { id: "CL04", area: "Entrance", task: "Wipe glass & mats", assignee: "Solomon", due: "20:00", status: "Overdue", type: "one-off", source: "Manager" },
  { id: "CL05", area: "Storage", task: "Organize dry storage", assignee: "Solomon", due: "Sep 29 18:00", status: "Completed", type: "one-off", source: "Manager" },
];

export const cleaningTemplates = [
  { id: "CT01", area: "Restrooms", task: "Deep clean restrooms", assignee: "Tigist", frequency: "Daily", due: "21:00" },
  { id: "CT02", area: "Kitchen", task: "Floor & surfaces", assignee: "Tigist", frequency: "Daily", due: "22:30" },
  { id: "CT03", area: "Dining area", task: "Sweep & mop", assignee: "Solomon", frequency: "Weekly (Mon, Wed, Fri)", due: "08:00" },
];

export const assets = [
  { id: "A01", name: "Industrial Oven #1", category: "Kitchen Equipment", serial: "OV-2022-01", purchase: "2022-03-10", warranty: "2025-03-10", location: "Kitchen", status: "Active" },
  { id: "A02", name: "Espresso Machine", category: "Kitchen Equipment", serial: "ESP-9912", purchase: "2023-06-01", warranty: "2025-12-01", location: "Coffee bar", status: "Active" },
  { id: "A03", name: "Generator 25kVA", category: "Power", serial: "GEN-25-07", purchase: "2021-09-15", warranty: "2024-09-15", location: "Backyard", status: "Under Maintenance" },
  { id: "A04", name: "Cold Room", category: "Refrigeration", serial: "CR-08", purchase: "2022-11-20", warranty: "2025-11-20", location: "Kitchen", status: "Active" },
];

export const expenseTemplates = [
  { id: "TPL01", category: "Rent", frequency: "Monthly", day: 1, amount: 60000, lastRun: "Sep 01", active: true },
  { id: "TPL02", category: "Utilities", frequency: "Monthly", day: 15, amount: 0, lastRun: "Sep 15", active: true },
  { id: "TPL03", category: "Internet", frequency: "Monthly", day: 5, amount: 1200, lastRun: "Sep 05", active: false },
];

export const maintenanceRequests = [
  { id: "MR01", asset: "Generator 25kVA", problem: "Won't start on test", priority: "High", status: "Assigned", assignee: "Solomon (vendor: GenPro)", cost: 0, date: "Sep 30", reported: "Security" },
  { id: "MR02", asset: "Espresso Machine", problem: "Steam wand leaking", priority: "Medium", status: "In Progress", assignee: "Vendor: Caffe Tech", cost: 1200, date: "Sep 28", reported: "Kitchen" },
  { id: "MR03", asset: "No asset", problem: "Front door hinge loose", priority: "Low", status: "Completed", assignee: "Solomon", cost: 150, date: "Sep 20", reported: "Waiter" },
  { id: "MR04", asset: "Cold Room", problem: "Temperature fluctuating", priority: "High", status: "Reported", assignee: "Unassigned", cost: 0, date: "Sep 30", reported: "Inventory" },
];

export const visitors = [
  { id: "V01", name: "Dawit F.", phone: "+251911222333", purpose: "Supplier delivery", visiting: "Inventory Staff", checkIn: "09:12", checkOut: "09:40", notes: "Bole Poultry" },
  { id: "V02", name: "Sara B.", phone: "+251912333444", purpose: "Maintenance", visiting: "Manager", checkIn: "10:05", checkOut: "", notes: "GenPro technician" },
  { id: "V03", name: "Mike T.", phone: "+251913444555", purpose: "Meeting", visiting: "Manager", checkIn: "14:20", checkOut: "15:10", notes: "" },
];

export const incidents = [
  { id: "IN01", type: "Theft", date: "Sep 29 21:30", location: "Patio", description: "Customer reported missing phone from table 9", reported: "Waiter", status: "Under Review", resolution: "" },
  { id: "IN02", type: "Dispute", date: "Sep 28 19:10", location: "Main Hall", description: "Bill dispute over service charge", reported: "Security", status: "Resolved", resolution: "Manager explained auto service charge; customer accepted." },
  { id: "IN03", type: "Accident", date: "Sep 30 08:45", location: "Kitchen", description: "Staff slipped on wet floor", reported: "Kitchen", status: "Reported", resolution: "" },
];

export const lostFound = [
  { id: "LF01", item: "Black umbrella", description: "Left at entrance", location: "Entrance", date: "Sep 29", foundBy: "Solomon", status: "Found", claimant: "", claimPhone: "", claimDate: "" },
  { id: "LF02", item: "Sunglasses", description: "Ray-Ban, brown", location: "Table 5", date: "Sep 28", foundBy: "Tigist", status: "Claimed", claimant: "Abebe G.", claimPhone: "+251911223344", claimDate: "Sep 29" },
];

export const employees = [
  { id: "E01", name: "Selam T.", number: "EMP-01", phone: "+251911000001", email: "selam@mesob.et", position: "Senior Waiter", department: "Front of House", hire: "2022-04-01", status: "Active", role: "Waiter" },
  { id: "E02", name: "Dawit M.", number: "EMP-02", phone: "+251911000002", email: "dawit@mesob.et", position: "Waiter", department: "Front of House", hire: "2023-01-15", status: "Active", role: "Waiter" },
  { id: "E03", name: "Chef Abebe", number: "EMP-03", phone: "+251911000003", email: "", position: "Head Chef", department: "Kitchen", hire: "2021-06-01", status: "Active", role: "Kitchen" },
  { id: "E04", name: "Tigist A.", number: "EMP-04", phone: "+251911000004", email: "", position: "Cleaner", department: "Cleaning", hire: "2022-09-10", status: "Active", role: "Cleaner" },
  { id: "E05", name: "Solomon G.", number: "EMP-05", phone: "+251911000005", email: "", position: "Cleaner", department: "Cleaning", hire: "2023-03-20", status: "Active", role: "Cleaner" },
  { id: "E06", name: "Yonas K.", number: "EMP-06", phone: "+251911000006", email: "yonas@mesob.et", position: "Inventory Clerk", department: "Store", hire: "2022-11-05", status: "Active", role: "Inventory" },
  { id: "E07", name: "Robel S.", number: "EMP-07", phone: "+251911000007", email: "", position: "Security Guard", department: "Security", hire: "2023-07-01", status: "Active", role: "Security" },
  { id: "E08", name: "Hanna L.", number: "EMP-08", phone: "+251911000008", email: "", position: "Junior Waiter", department: "Front of House", hire: "2024-02-01", status: "Inactive", role: "Waiter" },
];

export const users = [
  { id: "U01", username: "owner", email: "owner@mesob.et", fullName: "Restaurant Owner", role: "Manager", status: "Active", employee: "—", lastSignIn: "Sep 30 06:20", mustChange: false },
  { id: "U02", username: "admin1", email: "admin@mesob.et", fullName: "System Admin", role: "Administrator", status: "Active", employee: "—", lastSignIn: "Sep 29 17:40", mustChange: false },
  { id: "U03", username: "chef", email: "", fullName: "Chef Abebe", role: "Kitchen", status: "Active", employee: "Chef Abebe", lastSignIn: "Sep 30 06:10", mustChange: false },
  { id: "U04", username: "selam", email: "selam@mesob.et", fullName: "Selam T.", role: "Waiter", status: "Active", employee: "Selam T.", lastSignIn: "Sep 30 06:30", mustChange: false },
  { id: "U05", username: "yonas", email: "", fullName: "Yonas K.", role: "Inventory Staff", status: "Active", employee: "Yonas K.", lastSignIn: "Sep 29 08:00", mustChange: false },
  { id: "U06", username: "tigist", email: "", fullName: "Tigist A.", role: "Cleaner", status: "Active", employee: "Tigist A.", lastSignIn: "Sep 30 06:00", mustChange: false },
  { id: "U07", username: "robel", email: "", fullName: "Robel S.", role: "Security", status: "Active", employee: "Robel S.", lastSignIn: "Sep 29 22:00", mustChange: false },
  { id: "U08", username: "hanna", email: "", fullName: "Hanna L.", role: "Waiter", status: "Inactive", employee: "Hanna L.", lastSignIn: "Aug 30 19:00", mustChange: false },
  { id: "U09", username: "newwaiter", email: "", fullName: "New Waiter", role: "Waiter", status: "Active", employee: "—", lastSignIn: "Never", mustChange: true },
];

export const activityLog = [
  { id: "L01", who: "owner", when: "Sep 30 06:21", action: "Applied 10% discount", target: "ORD-0043", old: "0%", new: "10%", reason: "Regular customer" },
  { id: "L02", who: "chef", when: "Sep 30 06:05", action: "Toggled menu item unavailable", target: "Kitfo", old: "Available", new: "Unavailable", reason: "Out of beef" },
  { id: "L03", who: "yonas", when: "Sep 29 12:31", action: "Emergency purchase recorded", target: "PO-0034", old: "", new: "2400 ETB", reason: "Ran out of water" },
  { id: "L04", who: "owner", when: "Sep 29 23:59", action: "Business day auto-closed", target: "Sep 29", old: "Open", new: "Closed", reason: "" },
  { id: "L05", who: "admin1", when: "Sep 29 09:00", action: "User created", target: "newwaiter", old: "", new: "Waiter", reason: "" },
  { id: "L06", who: "selam", when: "Sep 29 18:46", action: "Recorded payment", target: "ORD-0043", old: "", new: "Cash 1,298.00", reason: "" },
  { id: "L07", who: "owner", when: "Sep 29 18:30", action: "Changed tax rate", target: "Settings", old: "15%", new: "15%", reason: "No change, reviewed" },
  { id: "L08", who: "yonas", when: "Sep 29 16:01", action: "Stock adjustment", target: "Berbere spice", old: "2000 g", new: "1500 g", reason: "Spillage during prep" },
];

export const notifications = [
  { id: "N01", event: "New kitchen ticket", detail: "ORD-0044 round 1 — 5 items", time: "19:31", read: false, sound: true },
  { id: "N02", event: "Ticket Ready", detail: "ORD-0045 — Shiro Wot x2", time: "20:05", read: false, sound: true },
  { id: "N03", event: "Low stock", detail: "Beef below minimum (4,200 g)", time: "18:46", read: false, sound: false },
  { id: "N04", event: "Emergency purchase awaiting review", detail: "PO-0034 — Aqua Addis", time: "12:31", read: true, sound: false },
  { id: "N05", event: "Cleaning task overdue", detail: "Entrance — Wipe glass & mats", time: "20:00", read: false, sound: false },
  { id: "N06", event: "Warranty expiring", detail: "Generator 25kVA — expired", time: "09:00", read: true, sound: false },
  { id: "N07", event: "Delayed kitchen ticket", detail: "ORD-0042 round 2 — 23 min", time: "19:55", read: false, sound: false },
];

export const paymentMethods = [
  { name: "Cash", referenceRequired: false, active: true },
  { name: "Bank Transfer", referenceRequired: true, active: true },
  { name: "Mobile Money", referenceRequired: true, active: true },
  { name: "Card", referenceRequired: false, active: true },
];

export const managedLists = {
  inventoryCategories: ["Meat", "Vegetables", "Dairy", "Dry goods", "Beverages", "Spices", "Cleaning supplies", "Packaging"],
  expenseCategories: ["Rent", "Utilities", "Cleaning supplies", "Transportation", "Office", "Maintenance", "Other"],
  wasteReasons: ["Spoiled", "Expired", "Dropped or damaged", "Overcooked or wrong order", "Cancelled after preparation", "Other"],
  positions: ["Senior Waiter", "Waiter", "Junior Waiter", "Head Chef", "Cook", "Cleaner", "Inventory Clerk", "Security Guard", "Manager"],
  departments: ["Front of House", "Kitchen", "Cleaning", "Store", "Security", "Management"],
  cleaningAreas: ["Dining area", "Kitchen", "Restrooms", "Storage", "Entrance", "Patio"],
  incidentTypes: ["Theft", "Dispute", "Accident", "Property damage", "Other"],
  assetCategories: ["Kitchen Equipment", "Refrigeration", "Power", "Furniture", "Electronics"],
  mealPeriods: mealPeriods,
  tableSections: ["Window", "Main Hall", "Patio", "Private"],
};