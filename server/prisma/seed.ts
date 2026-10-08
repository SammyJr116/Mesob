import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Mesob Restaurant database...");

  // 1. Settings singleton
  await prisma.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      restaurantName: "Mesob House",
      tin: "ER1234567890",
      vatRate: 15.0,
      serviceChargeRate: 10.0,
      closingTime: "04:00",
      delayedTicketMinutes: 20,
      lowStockThreshold: 5,
      inventoryTracking: true,
      currentBusinessDate: "2026-10-08",
      currency: "ETB",
    },
  });

  // 2. Employees
  const empData = [
    { id: "E01", employeeNumber: "EMP-01", name: "Selam T.", role: "Waiter", phone: "+251911000001", email: "selam@mesob.et" },
    { id: "E02", employeeNumber: "EMP-02", name: "Dawit M.", role: "Waiter", phone: "+251911000002", email: "dawit@mesob.et" },
    { id: "E03", employeeNumber: "EMP-03", name: "Chef Abebe", role: "Kitchen", phone: "+251911000003", email: "chef@mesob.et" },
    { id: "E04", employeeNumber: "EMP-04", name: "Tigist A.", role: "Cleaner", phone: "+251911000004", email: "tigist@mesob.et" },
    { id: "E05", employeeNumber: "EMP-05", name: "Solomon G.", role: "Cleaner", phone: "+251911000005", email: "solomon@mesob.et" },
    { id: "E06", employeeNumber: "EMP-06", name: "Yonas K.", role: "Inventory", phone: "+251911000006", email: "yonas@mesob.et" },
    { id: "E07", employeeNumber: "EMP-07", name: "Robel S.", role: "Security", phone: "+251911000007", email: "robel@mesob.et" },
    { id: "E08", employeeNumber: "EMP-08", name: "Hanna L.", role: "Waiter", phone: "+251911000008", email: "hanna@mesob.et", status: "Inactive" },
  ];

  for (const emp of empData) {
    await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: {},
      create: {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        name: emp.name,
        role: emp.role,
        phone: emp.phone,
        email: emp.email,
        status: emp.status || "Active",
      },
    });
  }

  // 3. Users with bcrypt password hashes
  const defaultPasswordHash = await bcrypt.hash("mesob1234", 10);

  const usersData = [
    { username: "owner", email: "owner@mesob.et", role: Role.MANAGER, status: UserStatus.ACTIVE },
    { username: "admin1", email: "admin@mesob.et", role: Role.ADMIN, status: UserStatus.ACTIVE },
    { username: "chef", email: "chef@mesob.et", role: Role.KITCHEN, status: UserStatus.ACTIVE, employeeId: "E03" },
    { username: "selam", email: "selam@mesob.et", role: Role.WAITER, status: UserStatus.ACTIVE, employeeId: "E01" },
    { username: "dawit", email: "dawit@mesob.et", role: Role.WAITER, status: UserStatus.ACTIVE, employeeId: "E02" },
    { username: "yonas", email: "yonas@mesob.et", role: Role.INVENTORY, status: UserStatus.ACTIVE, employeeId: "E06" },
    { username: "tigist", email: "tigist@mesob.et", role: Role.CLEANER, status: UserStatus.ACTIVE, employeeId: "E04" },
    { username: "robel", email: "robel@mesob.et", role: Role.SECURITY, status: UserStatus.ACTIVE, employeeId: "E07" },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        email: u.email,
        passwordHash: defaultPasswordHash,
        role: u.role,
        status: u.status,
        employeeId: u.employeeId,
      },
    });
  }

  // 4. Tables
  const tablesData = [
    { id: "T01", number: "1", seats: 2, section: "Window", status: "Available" },
    { id: "T02", number: "2", seats: 2, section: "Window", status: "Occupied" },
    { id: "T03", number: "3", seats: 4, section: "Window", status: "Cleaning" },
    { id: "T04", number: "4", seats: 4, section: "Main Hall", status: "Available" },
    { id: "T05", number: "5", seats: 4, section: "Main Hall", status: "Occupied" },
    { id: "T06", number: "6", seats: 6, section: "Main Hall", status: "Reserved" },
    { id: "T07", number: "7", seats: 6, section: "Main Hall", status: "Available" },
    { id: "T08", number: "8", seats: 2, section: "Patio", status: "Out of Service" },
    { id: "T09", number: "9", seats: 4, section: "Patio", status: "Available" },
    { id: "T10", number: "10", seats: 8, section: "Patio", status: "Occupied" },
    { id: "T11", number: "11", seats: 4, section: "Private", status: "Reserved" },
    { id: "T12", number: "12", seats: 10, section: "Private", status: "Available" },
  ];

  for (const t of tablesData) {
    await prisma.table.upsert({
      where: { number: t.number },
      update: {},
      create: t,
    });
  }

  // 5. Suppliers
  const suppliersData = [
    { id: "S01", name: "Bole Poultry", contactPerson: "Getachew", phone: "+251911234567", email: "sales@bolepoultry.et" },
    { id: "S02", name: "Atlas Butcher", contactPerson: "Mahmud", phone: "+251912345678", email: "sales@atlasbutcher.et" },
    { id: "S03", name: "Merkato Veg", contactPerson: "Almaz", phone: "+251913456789", email: "almaz@merkato.et" },
    { id: "S04", name: "Spice House", contactPerson: "Yohannes", phone: "+251914567890", email: "orders@spicehouse.et" },
    { id: "S05", name: "Yirgacheffe Coop", contactPerson: "Tadesse", phone: "+251915678901", email: "tadesse@yirg.et" },
    { id: "S06", name: "Shola Dairy", contactPerson: "Helen", phone: "+251916789012", email: "contact@sholadairy.et" },
    { id: "S07", name: "Injera House", contactPerson: "Marta", phone: "+251917890123", email: "orders@injerahouse.et" },
    { id: "S08", name: "Aqua Addis", contactPerson: "Bekele", phone: "+251918901234", email: "sales@aquaaddis.et" },
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  // 6. Inventory Items
  const inventoryData = [
    { id: "I01", code: "SKU-CHICKEN", name: "Chicken", category: "Meat", baseUnit: "g", currentStock: 12500, minimumStock: 8000, reorderQuantity: 20000, defaultSupplierId: "S01", costPerUnit: 0.45 },
    { id: "I02", code: "SKU-BEEF", name: "Beef", category: "Meat", baseUnit: "g", currentStock: 4200, minimumStock: 5000, reorderQuantity: 15000, defaultSupplierId: "S02", costPerUnit: 0.65 },
    { id: "I03", code: "SKU-ONION", name: "Onion", category: "Vegetables", baseUnit: "g", currentStock: 28000, minimumStock: 10000, reorderQuantity: 25000, defaultSupplierId: "S03", costPerUnit: 0.12 },
    { id: "I04", code: "SKU-BERBERE", name: "Berbere spice", category: "Spices", baseUnit: "g", currentStock: 1500, minimumStock: 2000, reorderQuantity: 5000, defaultSupplierId: "S04", costPerUnit: 0.80 },
    { id: "I05", code: "SKU-INJERA", name: "Injera", category: "Dry goods", baseUnit: "pieces", currentStock: 64, minimumStock: 40, reorderQuantity: 100, defaultSupplierId: "S07", costPerUnit: 15.00 },
    { id: "I06", code: "SKU-COFFEE", name: "Coffee beans", category: "Dry goods", baseUnit: "g", currentStock: 3200, minimumStock: 2000, reorderQuantity: 6000, defaultSupplierId: "S05", costPerUnit: 0.70 },
    { id: "I07", code: "SKU-MILK", name: "Milk", category: "Dairy", baseUnit: "ml", currentStock: 1800, minimumStock: 3000, reorderQuantity: 8000, defaultSupplierId: "S06", costPerUnit: 0.08 },
    { id: "I08", code: "SKU-MANGO", name: "Mango", category: "Vegetables", baseUnit: "pieces", currentStock: 22, minimumStock: 15, reorderQuantity: 40, defaultSupplierId: "S03", costPerUnit: 25.00 },
    { id: "I09", code: "SKU-WATER", name: "Bottled Water", category: "Beverages", baseUnit: "pieces", currentStock: 8, minimumStock: 24, reorderQuantity: 96, defaultSupplierId: "S08", costPerUnit: 20.00 },
    { id: "I10", code: "SKU-AWAZE", name: "Awaze", category: "Spices", baseUnit: "g", currentStock: 900, minimumStock: 500, reorderQuantity: 2000, defaultSupplierId: "S04", costPerUnit: 0.50 },
    { id: "I11", code: "SKU-BUTTER", name: "Butter", category: "Dairy", baseUnit: "g", currentStock: 600, minimumStock: 800, reorderQuantity: 2000, defaultSupplierId: "S06", costPerUnit: 0.90 },
    { id: "I12", code: "SKU-CHICKPEAS", name: "Chickpeas", category: "Dry goods", baseUnit: "g", currentStock: 4200, minimumStock: 2000, reorderQuantity: 10000, defaultSupplierId: "S03", costPerUnit: 0.18 },
  ];

  for (const inv of inventoryData) {
    await prisma.inventoryItem.upsert({
      where: { code: inv.code },
      update: {},
      create: inv,
    });
  }

  // 7. Menu Categories
  const categories = [
    { id: "C1", name: "Breakfast", orderIndex: 1 },
    { id: "C2", name: "Main Dishes", orderIndex: 2 },
    { id: "C3", name: "Drinks", orderIndex: 3 },
    { id: "C4", name: "Desserts", orderIndex: 4 },
    { id: "C5", name: "Coffee", orderIndex: 5 },
  ];

  for (const cat of categories) {
    await prisma.menuCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // 8. Menu Items & Variants
  const items = [
    { id: "M01", name: "Ful Medames", categoryId: "C1", basePrice: 180, mealPeriod: "Breakfast", image: "/images/menu/ful-medames.svg", variants: [{ name: "Regular", price: 180, recipeMultiplier: 1.0, isDefault: true }, { name: "Large", price: 240, recipeMultiplier: 1.4 }] },
    { id: "M02", name: "Chechebsa", categoryId: "C1", basePrice: 220, mealPeriod: "Breakfast", image: "/images/menu/chechebsa.svg", variants: [{ name: "Regular", price: 220, recipeMultiplier: 1.0, isDefault: true }] },
    { id: "M03", name: "Doro Wot", categoryId: "C2", basePrice: 480, mealPeriod: "All day", image: "/images/menu/doro-wot.svg", variants: [{ name: "Single", price: 480, recipeMultiplier: 1.0, isDefault: true }, { name: "Sharing", price: 720, recipeMultiplier: 1.6 }] },
    { id: "M04", name: "Tibs Special", categoryId: "C2", basePrice: 520, mealPeriod: "All day", image: "/images/menu/tibs-special.svg", variants: [{ name: "Regular", price: 520, recipeMultiplier: 1.0, isDefault: true }, { name: "Large", price: 680, recipeMultiplier: 1.4 }] },
    { id: "M05", name: "Shiro Wot (Fasting)", categoryId: "C2", basePrice: 320, isFasting: true, mealPeriod: "All day", image: "/images/menu/shiro-wot.svg", variants: [{ name: "Regular", price: 320, recipeMultiplier: 1.0, isDefault: true }] },
    { id: "M06", name: "Kitfo", categoryId: "C2", basePrice: 680, manualAvailable: false, mealPeriod: "All day", image: "/images/menu/kitfo.svg", variants: [{ name: "Regular", price: 680, recipeMultiplier: 1.0, isDefault: true }] },
    { id: "M07", name: "Beyaynetu (Fasting Platter)", categoryId: "C2", basePrice: 360, isFasting: true, mealPeriod: "All day", image: "/images/menu/beyaynetu.svg", variants: [{ name: "Regular", price: 360, recipeMultiplier: 1.0, isDefault: true }] },
    { id: "M08", name: "Bottled Water", categoryId: "C3", basePrice: 60, isFasting: true, mealPeriod: "All day", image: "/images/menu/bottled-water.svg", variants: [{ name: "500ml", price: 60, recipeMultiplier: 1.0, isDefault: true }, { name: "1L", price: 90, recipeMultiplier: 1.5 }] },
    { id: "M09", name: "Fresh Mango Juice", categoryId: "C3", basePrice: 120, isFasting: true, mealPeriod: "All day", image: "/images/menu/mango-juice.svg", variants: [{ name: "Regular", price: 120, recipeMultiplier: 1.0, isDefault: true }] },
    { id: "M10", name: "Sparkling Water", categoryId: "C3", basePrice: 80, isFasting: true, mealPeriod: "All day", status: "Inactive", image: "/images/menu/sparkling-water.svg", variants: [{ name: "Regular", price: 80, recipeMultiplier: 1.0, isDefault: true }] },
    { id: "M11", name: "Tiramisu", categoryId: "C4", basePrice: 150, mealPeriod: "All day", image: "/images/menu/tiramisu.svg", variants: [{ name: "Regular", price: 150, recipeMultiplier: 1.0, isDefault: true }] },
    { id: "M12", name: "Macchiato", categoryId: "C5", basePrice: 70, mealPeriod: "All day", image: "/images/menu/macchiato.svg", variants: [{ name: "Single", price: 70, recipeMultiplier: 1.0, isDefault: true }, { name: "Double", price: 110, recipeMultiplier: 1.6 }] },
    { id: "M13", name: "Buna (Ethiopian Coffee)", categoryId: "C5", basePrice: 90, mealPeriod: "All day", image: "/images/menu/buna.svg", variants: [{ name: "Traditional Jebena", price: 90, recipeMultiplier: 1.0, isDefault: true }] },
  ];

  for (const it of items) {
    const { variants, ...itemFields } = it;
    await prisma.menuItem.upsert({
      where: { id: itemFields.id },
      update: {},
      create: {
        ...itemFields,
        variants: {
          create: variants,
        },
      },
    });
  }

  // 9. Customers
  const customersData = [
    { id: "CU01", name: "Abebe G.", phone: "+251911223344", email: "abebe@example.com", notes: "Prefers window seat" },
    { id: "CU02", name: "Meron A.", phone: "+251912556677", email: "", notes: "Takeaway regular" },
    { id: "CU03", name: "Bekele family", phone: "+251913445566", email: "", notes: "Group of 6, table 6" },
    { id: "CU04", name: "Aster T.", phone: "+251914667788", email: "aster.t@example.com", notes: "Private room bookings" },
    { id: "CU05", name: "Yonas K.", phone: "+251915889900", email: "", notes: "" },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
  }

  // 10. Initial Activity Log
  await prisma.activityLog.create({
    data: {
      userId: (await prisma.user.findFirst({ where: { role: Role.ADMIN } }))?.id,
      role: "ADMIN",
      action: "System Initialized",
      target: "Database",
      reason: "Initial seed completed on Laragon MySQL",
    },
  });

  console.log("Seeding complete! Database is ready.");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
