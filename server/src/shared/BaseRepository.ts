// ABOUTME: Abstract generic repository providing reusable CRUD operations over Mongoose models.
// ABOUTME: All domain repositories extend this — demonstrates OOP inheritance and abstraction.

import { Model, Document, UpdateQuery } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id);
  }

  async findOne(filter: Record<string, unknown>, select?: string): Promise<T | null> {
    const query = this.model.findOne(filter as any);
    if (select) query.select(select);
    return query;
  }

  async findMany(filter: Record<string, unknown>, options?: Record<string, unknown>): Promise<T[]> {
    return this.model.find(filter as any, null, options);
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data as T);
  }

  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id);
  }

  async exists(filter: Record<string, unknown>): Promise<boolean> {
    const doc = await this.model.exists(filter as any);
    return doc !== null;
  }
}
