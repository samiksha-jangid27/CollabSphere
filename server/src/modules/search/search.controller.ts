// ABOUTME: SearchController — HTTP handlers for /api/v1/search endpoints.
// ABOUTME: Thin layer: parses query params, delegates to service, formats response.

import { Request, Response, NextFunction } from 'express';
import { ISearchService } from './search.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';

export class SearchController {
  constructor(private readonly service: ISearchService) {}

  searchProfiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        city: req.query.city as string | undefined,
        niche: req.query.niche as string | undefined,
        platform: req.query.platform as string | undefined,
      };
      const profiles = await this.service.searchProfiles(filters);
      sendSuccess(
        res,
        profiles,
        `Found ${profiles.length} profiles`,
        HTTP_STATUS.OK,
      );
    } catch (err) {
      next(err);
    }
  };

  searchCities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string) || '';
      const cities = await this.service.searchCities(q);
      sendSuccess(res, cities, 'Cities retrieved', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
