import { PrismaClient } from '../../generated/prisma';
import { ContentType, RegistrationStatus } from '../types/enums';
import { sanitizeHtml } from '../utils/sanitization';
import { generateSlug } from '../utils/slug';

const prisma = new PrismaClient();

export interface EventFilters {
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  registrationEnabled?: boolean;
  search?: string;
}

export interface EventPagination {
  page: number;
  limit: number;
}

export interface CreateEventData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  maxParticipants?: number;
  registrationDeadline?: string;
  registrationEnabled?: boolean;
  featuredImage?: string;
  isPublished?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  authorId: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  maxParticipants?: number;
  registrationDeadline?: string;
  registrationEnabled?: boolean;
  featuredImage?: string;
  isPublished?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
}

export interface EventRegistrationData {
  eventId: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  dietaryRestrictions?: string;
  emergencyContact?: string;
}

export const eventService = {
  // Get events with filtering and pagination
  async getEvents(filters: EventFilters, pagination: EventPagination) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    
    // Build where clause for content
    const contentWhere: any = {
      type: ContentType.EVENT,
    };
    
    // Build where clause for event
    const eventWhere: any = {};
    
    if (filters.dateFrom || filters.dateTo) {
      eventWhere.date = {};
      if (filters.dateFrom) {
        eventWhere.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        eventWhere.date.lte = new Date(filters.dateTo);
      }
    }
    
    if (filters.location) {
      eventWhere.location = {
        contains: filters.location,
        mode: 'insensitive',
      };
    }
    
    if (filters.registrationEnabled !== undefined) {
      eventWhere.registrationEnabled = filters.registrationEnabled;
    }
    
    if (filters.search) {
      contentWhere.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    // Combine filters
    const where = {
      ...contentWhere,
      event: eventWhere,
    };
    
    // Get events with content and registration information
    const [events, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          event: {
            date: 'asc', // Upcoming events first
          },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            include: {
              registrations: {
                select: {
                  id: true,
                  status: true,
                  registeredAt: true,
                },
              },
            },
          },
        },
      }),
      prisma.content.count({ where }),
    ]);
    
    return {
      events,
      total,
    };
  },

  // Get event by ID
  async getEventById(id: string) {
    return await prisma.content.findUnique({
      where: { 
        id,
        type: ContentType.EVENT,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          include: {
            registrations: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            gallery: {
              select: {
                id: true,
                url: true,
                thumbnailUrl: true,
                type: true,
                filename: true,
              },
            },
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            type: true,
            filename: true,
          },
        },
      },
    });
  },

  // Create new event
  async createEvent(data: CreateEventData) {
    // Sanitize HTML content to prevent XSS
    const sanitizedDescription = sanitizeHtml(data.description);
    
    // Generate slug from title
    const baseSlug = generateSlug(data.title);
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await prisma.content.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Parse dates if provided
    const eventDate = new Date(data.date);
    const publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const registrationDeadline = data.registrationDeadline ? new Date(data.registrationDeadline) : null;
    
    // If content is published but no publishedAt date, set it to now
    const finalPublishedAt = data.isPublished && !publishedAt ? new Date() : publishedAt;
    
    // Create content and event in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create content first
      const content = await tx.content.create({
        data: {
          type: ContentType.EVENT,
          title: data.title,
          content: sanitizedDescription,
          slug,
          featuredImage: data.featuredImage,
          isPublished: data.isPublished || false,
          publishedAt: finalPublishedAt,
          scheduledAt,
          authorId: data.authorId,
        },
      });
      
      // Create event
      const event = await tx.event.create({
        data: {
          contentId: content.id,
          date: eventDate,
          time: data.time,
          location: data.location,
          maxParticipants: data.maxParticipants,
          registrationDeadline,
          registrationEnabled: data.registrationEnabled ?? true,
        },
      });
      
      return { content, event };
    });
    
    // Return the complete event with relations
    return await this.getEventById(result.content.id);
  },

  // Update existing event
  async updateEvent(id: string, data: UpdateEventData) {
    const contentUpdateData: any = {};
    const eventUpdateData: any = {};
    
    // Prepare content updates
    if (data.title !== undefined) {
      contentUpdateData.title = data.title;
      // Regenerate slug if title changes
      const baseSlug = generateSlug(data.title);
      let slug = baseSlug;
      let counter = 1;
      
      // Ensure slug is unique (excluding current content)
      while (await prisma.content.findFirst({ 
        where: { 
          slug,
          NOT: { id }
        } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      contentUpdateData.slug = slug;
    }
    
    if (data.description !== undefined) {
      contentUpdateData.content = sanitizeHtml(data.description);
    }
    
    if (data.featuredImage !== undefined) {
      contentUpdateData.featuredImage = data.featuredImage;
    }
    
    if (data.isPublished !== undefined) {
      contentUpdateData.isPublished = data.isPublished;
      
      // If publishing for the first time, set publishedAt
      if (data.isPublished && !data.publishedAt) {
        const existingContent = await prisma.content.findUnique({
          where: { id },
          select: { publishedAt: true },
        });
        
        if (!existingContent?.publishedAt) {
          contentUpdateData.publishedAt = new Date();
        }
      }
    }
    
    if (data.publishedAt !== undefined) {
      contentUpdateData.publishedAt = new Date(data.publishedAt);
    }
    
    if (data.scheduledAt !== undefined) {
      contentUpdateData.scheduledAt = new Date(data.scheduledAt);
    }
    
    // Prepare event updates
    if (data.date !== undefined) {
      eventUpdateData.date = new Date(data.date);
    }
    
    if (data.time !== undefined) {
      eventUpdateData.time = data.time;
    }
    
    if (data.location !== undefined) {
      eventUpdateData.location = data.location;
    }
    
    if (data.maxParticipants !== undefined) {
      eventUpdateData.maxParticipants = data.maxParticipants;
    }
    
    if (data.registrationDeadline !== undefined) {
      eventUpdateData.registrationDeadline = new Date(data.registrationDeadline);
    }
    
    if (data.registrationEnabled !== undefined) {
      eventUpdateData.registrationEnabled = data.registrationEnabled;
    }
    
    // Update both content and event in a transaction
    await prisma.$transaction(async (tx) => {
      // Update content if there are changes
      if (Object.keys(contentUpdateData).length > 0) {
        await tx.content.update({
          where: { id },
          data: contentUpdateData,
        });
      }
      
      // Update event if there are changes
      if (Object.keys(eventUpdateData).length > 0) {
        await tx.event.update({
          where: { contentId: id },
          data: eventUpdateData,
        });
      }
    });
    
    // Return the updated event
    return await this.getEventById(id);
  },

  // Delete event
  async deleteEvent(id: string) {
    // Deleting content will cascade delete the event due to foreign key constraint
    await prisma.content.delete({
      where: { id },
    });
  },

  // Register for event
  async registerForEvent(data: EventRegistrationData) {
    // Check if event exists and registration is enabled
    const event = await this.getEventById(data.eventId);
    
    if (!event || !event.event) {
      throw new Error('Event not found');
    }
    
    if (!event.event.registrationEnabled) {
      throw new Error('Registration is not enabled for this event');
    }
    
    // Check registration deadline
    if (event.event.registrationDeadline && new Date() > event.event.registrationDeadline) {
      throw new Error('Registration deadline has passed');
    }
    
    // Check if event is full
    const confirmedRegistrations = event.event.registrations.filter(
      reg => reg.status === RegistrationStatus.CONFIRMED
    ).length;
    
    if (event.event.maxParticipants && confirmedRegistrations >= event.event.maxParticipants) {
      throw new Error('Event is full');
    }
    
    // Check for duplicate registration
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_email: {
          eventId: data.eventId,
          email: data.email,
        },
      },
    });
    
    if (existingRegistration) {
      throw new Error('Email is already registered for this event');
    }
    
    // Create registration
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: data.eventId,
        userId: data.userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        dietaryRestrictions: data.dietaryRestrictions,
        emergencyContact: data.emergencyContact,
        status: RegistrationStatus.CONFIRMED, // Auto-confirm for now
      },
      include: {
        event: {
          include: {
            content: {
              select: {
                title: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return registration;
  },

  // Get event registrations
  async getEventRegistrations(eventId: string, pagination: EventPagination) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    
    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { eventId },
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.eventRegistration.count({ where: { eventId } }),
    ]);
    
    return {
      registrations,
      total,
    };
  },

  // Get published events for public access
  async getPublishedEvents(limit: number = 10) {
    const now = new Date();
    
    return await prisma.content.findMany({
      where: {
        type: ContentType.EVENT,
        isPublished: true,
        publishedAt: {
          lte: now, // Only show events that should be published by now
        },
        event: {
          date: {
            gte: now, // Only show upcoming events
          },
        },
      },
      take: limit,
      orderBy: {
        event: {
          date: 'asc', // Upcoming events first
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          include: {
            registrations: {
              where: {
                status: RegistrationStatus.CONFIRMED,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  },
};