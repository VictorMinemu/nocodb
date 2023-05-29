import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { GlobalGuard } from '../guards/global/global.guard';
import { parseHrtimeToSeconds } from '../helpers';
import {
  Acl,
  ExtractProjectIdMiddleware,
} from '../middlewares/extract-project-id/extract-project-id.middleware';
import { DataTableService } from '../services/data-table.service';

@Controller()
@UseGuards(ExtractProjectIdMiddleware, GlobalGuard)
export class DataTableController {
  constructor(private readonly dataTableService: DataTableService) {}

  // todo: Handle the error case where view doesnt belong to model
  @Get('/api/v1/tables/:modelId/rows')
  @Acl('dataList')
  async dataList(
    @Request() req,
    @Response() res,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
  ) {
    const startTime = process.hrtime();
    const responseData = await this.dataTableService.dataList({
      query: req.query,
      modelId: modelId,
      viewId: viewId,
    });
    const elapsedSeconds = parseHrtimeToSeconds(process.hrtime(startTime));
    res.setHeader('xc-db-response', elapsedSeconds);
    res.json(responseData);
  }

  @Get(['/api/v1/tables/:modelId/rows/count'])
  @Acl('dataCount')
  async dataCount(
    @Request() req,
    @Response() res,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
  ) {
    const countResult = await this.dataTableService.dataCount({
      query: req.query,
      modelId,
      viewId,
    });

    res.json(countResult);
  }

  @Post(['/api/v1/tables/:modelId/rows'])
  @HttpCode(200)
  @Acl('dataInsert')
  async dataInsert(
    @Request() req,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
    @Body() body: any,
  ) {
    return await this.dataTableService.dataInsert({
      modelId: modelId,
      body: body,
      viewId,
      cookie: req,
    });
  }

  @Patch(['/api/v1/tables/:modelId/rows'])
  @Acl('dataUpdate')
  async dataUpdate(
    @Request() req,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
    @Param('rowId') rowId: string,
  ) {
    return await this.dataTableService.dataUpdate({
      modelId: modelId,
      body: req.body,
      cookie: req,
      viewId,
    });
  }

  @Delete(['/api/v1/tables/:modelId/rows'])
  @Acl('dataDelete')
  async dataDelete(
    @Request() req,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
    @Param('rowId') rowId: string,
  ) {
    return await this.dataTableService.dataDelete({
      modelId: modelId,
      cookie: req,
      viewId,
      body: req.body,
    });
  }

  @Get(['/api/v1/base/tables/:modelId/rows/:rowId'])
  @Acl('dataRead')
  async dataRead(
    @Request() req,
    @Param('modelId') modelId: string,
    @Query('viewId') viewId: string,
    @Param('rowId') rowId: string,
  ) {
    return await this.dataTableService.dataRead({
      modelId,
      rowId: rowId,
      query: req.query,
      viewId,
    });
  }
}