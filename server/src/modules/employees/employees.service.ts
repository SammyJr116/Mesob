import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";

export class EmployeeError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "EmployeeError";
  }
}

export const employeesService = {
  /**
   * Auto-generate sequential employee number (EMP-001, EMP-002, ...)
   */
  async getNextEmployeeNumber(): Promise<string> {
    const employees = await prisma.employee.findMany({ select: { employeeNumber: true } });
    let maxNum = 0;
    for (const emp of employees) {
      const match = emp.employeeNumber.match(/EMP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `EMP-${String(nextNum).padStart(3, "0")}`;
  },

  /**
   * List employees with filtering and search
   */
  async listEmployees(query: {
    search?: string;
    role?: string;
    status?: string;
    department?: string;
  }) {
    const where: any = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.department) {
      where.department = query.department;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s } },
        { phone: { contains: s } },
        { email: { contains: s } },
        { employeeNumber: { contains: s } },
      ];
    }

    return prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            status: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { employeeNumber: "asc" },
    });
  },

  /**
   * Get single employee by ID
   */
  async getEmployeeById(id: string) {
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            status: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!emp) {
      throw new EmployeeError("Employee not found", 404);
    }

    return emp;
  },

  /**
   * Create employee (Manager only, PRD 6.1)
   */
  async createEmployee(data: {
    name: string;
    role: string;
    phone: string;
    email?: string;
    nationalId?: string;
    department?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    status?: string;
    joinedDate?: string | Date;
  }, managerId: string) {
    if (!data.name || !data.role || !data.phone) {
      throw new EmployeeError("Name, role, and phone number are required", 400);
    }

    const employeeNumber = await this.getNextEmployeeNumber();

    const employee = await prisma.employee.create({
      data: {
        employeeNumber,
        name: data.name.trim(),
        role: data.role.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        nationalId: data.nationalId?.trim() || null,
        department: data.department?.trim() || null,
        address: data.address?.trim() || null,
        emergencyContactName: data.emergencyContactName?.trim() || null,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
        notes: data.notes?.trim() || null,
        status: data.status || "Active",
        joinedDate: data.joinedDate ? new Date(data.joinedDate) : new Date(),
      },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: managerId,
        role: Role.MANAGER,
        action: "EMPLOYEE_CREATE",
        target: "Employee",
        targetId: employee.id,
        newValue: JSON.stringify({ employeeNumber, name: employee.name, role: employee.role }),
        reason: `Created employee record ${employeeNumber}`,
      },
    });

    return employee;
  },

  /**
   * Update employee details or status (PRD 6.1, 6.7)
   */
  async updateEmployee(id: string, data: {
    name?: string;
    role?: string;
    phone?: string;
    email?: string;
    nationalId?: string;
    department?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    status?: string;
    joinedDate?: string | Date;
  }, managerId: string) {
    const existing = await this.getEmployeeById(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.role !== undefined) updateData.role = data.role.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.nationalId !== undefined) updateData.nationalId = data.nationalId?.trim() || null;
    if (data.department !== undefined) updateData.department = data.department?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName?.trim() || null;
    if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.joinedDate !== undefined) updateData.joinedDate = data.joinedDate ? new Date(data.joinedDate) : null;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    // PRD 6.2.3: Deactivating an employee automatically deactivates their linked user account
    if (data.status && (data.status === "Terminated" || data.status === "Inactive")) {
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { status: "SUSPENDED" },
        });
      }
    } else if (data.status === "Active" && existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { status: "ACTIVE" },
      });
    }

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: managerId,
        role: Role.MANAGER,
        action: "EMPLOYEE_UPDATE",
        target: "Employee",
        targetId: id,
        oldValue: JSON.stringify({ status: existing.status, role: existing.role, phone: existing.phone }),
        newValue: JSON.stringify(updateData),
        reason: `Updated employee ${existing.employeeNumber}`,
      },
    });

    return updated;
  },

  /**
   * Delete employee with archive-only guard (PRD 4.6.1)
   */
  async deleteEmployee(id: string, managerId: string) {
    const existing = await this.getEmployeeById(id);

    // Block deletion if linked to orders
    const orderCount = await prisma.order.count({ where: { waiterId: id } });
    if (orderCount > 0) {
      throw new EmployeeError(
        "Cannot delete employee with linked orders. Change status to Terminated or Inactive instead.",
        400
      );
    }

    // Also check if assigned to user account
    if (existing.userId) {
      throw new EmployeeError(
        "Cannot delete employee linked to active user account. Unlink or deactivate user first.",
        400
      );
    }

    await prisma.employee.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: managerId,
        role: Role.MANAGER,
        action: "EMPLOYEE_DELETE",
        target: "Employee",
        targetId: id,
        oldValue: JSON.stringify({ employeeNumber: existing.employeeNumber, name: existing.name }),
        reason: `Deleted employee record ${existing.employeeNumber}`,
      },
    });

    return { success: true };
  },
};
