// ABOUTME: GeocodeController — thin HTTP handler delegating to GeocodeService.
// ABOUTME: Parses q from req.query, returns results in the standard API envelope.

import { Request, Response, NextFunction } from 'express';
import { IGeocodeService } from './geocode.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';

export class GeocodeController {
  constructor(private readonly service: IGeocodeService) {}

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query.q as string;
      const results = await this.service.search(q);
      sendSuccess(res, { results }, 'Geocode results', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
