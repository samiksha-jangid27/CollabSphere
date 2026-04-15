// ABOUTME: ProfileRepository — extends BaseRepository and adds findByUserId for 1:1 lookup.
// ABOUTME: All profile DB access goes through this class.

import { BaseRepository } from '../../shared/BaseRepository';
import { Profile, IProfile } from '../../models/Profile';

export class ProfileRepository extends BaseRepository<IProfile> {
  constructor() {
    super(Profile);
  }

  async findByUserId(userId: string): Promise<IProfile | null> {
    return this.model.findOne({ userId });
  }
}
