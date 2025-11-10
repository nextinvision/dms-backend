import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchVehicles(query: string, limit: number = 10) {
    const searchTerm = query.trim();

    if (!searchTerm) {
      return { vehicles: [], customers: [] };
    }

    // Search by phone number (via customer)
    const customersByPhone = await this.prisma.customer.findMany({
      where: {
        phone: { contains: searchTerm, mode: 'insensitive' },
      },
      take: limit,
    });

    // Search by registration number
    const vehiclesByReg = await this.prisma.vehicle.findMany({
      where: {
        registration: { contains: searchTerm, mode: 'insensitive' },
      },
      include: {
        customer: true,
        serviceHistory: {
          take: 5,
          orderBy: { serviceDate: 'desc' },
        },
      },
      take: limit,
    });

    // Search by VIN
    const vehiclesByVIN = await this.prisma.vehicle.findMany({
      where: {
        vin: { contains: searchTerm, mode: 'insensitive' },
      },
      include: {
        customer: true,
        serviceHistory: {
          take: 5,
          orderBy: { serviceDate: 'desc' },
        },
      },
      take: limit,
    });

    // Search by customer name
    const customersByName = await this.prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        vehicles: {
          include: {
            serviceHistory: {
              take: 5,
              orderBy: { serviceDate: 'desc' },
            },
          },
        },
      },
      take: limit,
    });

    // Combine and deduplicate results
    const allVehicles = new Map();
    const allCustomers = new Map();

    // Add vehicles by registration
    vehiclesByReg.forEach((v) => {
      allVehicles.set(v.id, v);
      if (v.customer) {
        allCustomers.set(v.customer.id, v.customer);
      }
    });

    // Add vehicles by VIN
    vehiclesByVIN.forEach((v) => {
      allVehicles.set(v.id, v);
      if (v.customer) {
        allCustomers.set(v.customer.id, v.customer);
      }
    });

    // Add customers by phone
    customersByPhone.forEach((c) => {
      allCustomers.set(c.id, c);
    });

    // Add customers by name with their vehicles
    customersByName.forEach((c) => {
      allCustomers.set(c.id, c);
      c.vehicles?.forEach((v) => {
        allVehicles.set(v.id, v);
      });
    });

    return {
      vehicles: Array.from(allVehicles.values()).slice(0, limit),
      customers: Array.from(allCustomers.values()).slice(0, limit),
    };
  }

  async getVehicleDetails(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        customer: true,
        serviceHistory: {
          orderBy: { serviceDate: 'desc' },
        },
        jobCards: {
          include: {
            serviceCenter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return vehicle;
  }

  async getCustomerDetails(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        vehicles: {
          include: {
            serviceHistory: {
              take: 3,
              orderBy: { serviceDate: 'desc' },
            },
          },
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            serviceCenter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }
}

