/**
 * Records List
 *  - default
 *  - pageSize
 *  - limit
 *  - offset
 *  - fields, single
 *  - fields, multiple
 *  - sort, ascending
 *  - sort, descending
 *  - sort, multiple
 *  - filter, single
 *  - filter, multiple
 *  - field type : number based (number, currency, percent, decimal, rating, duration)
 *  - field type : text based (text, longtext, email, phone, url)
 *  - field type : select based (single select, multi select)
 *  - field type : date based (date, datetime, time)
 *  - field type : virtual (link, lookup, rollup, formula)
 *  - field type : misc (checkbox, attachment, barcode, qrcode, json)
 *  - viewID
 *  - viewID, explicit fields
 *  - viewID, explicit sort
 *  - viewID, explicit filter
 *  # Error handling
 *    - invalid table ID
 *    - invalid view ID
 *    - invalid field name
 *    - invalid sort condition
 *    - invalid filter condition
 *    - invalid pageSize
 *    - invalid limit
 *    - invalid offset
 *
 *
 * Records Create
 *  - field type : number based (number, currency, percent, decimal, rating, duration)
 *  - field type : text based (text, longtext, email, phone, url)
 *  - field type : select based (single select, multi select)
 *  - field type : date based (date, datetime, time)
 *  - field type : virtual (link)
 *  - field type : misc (checkbox, attachment, barcode, qrcode, json)
 *  - bulk insert
 *  - bulk insert-all
 *  # Error handling
 *    - invalid table ID
 *    - invalid field type
 *    - invalid field value (when validation enabled : email, url, phone number, rating, select fields, text fields, number fields, date fields)
 *    - invalid payload size
 *
 *
 * Record read
 *  - field type : number based (number, currency, percent, decimal, rating, duration)
 *  - field type : text based (text, longtext, email, phone, url)
 *  - field type : select based (single select, multi select)
 *  - field type : date based (date, datetime, time)
 *  - field type : virtual (link, lookup, rollup, formula)
 *  - field type : misc (checkbox, attachment, barcode, qrcode, json)
 *  # Error handling
 *    - invalid table ID
 *    - invalid record ID
 *
 *
 * Record update
 * - field type : number based (number, currency, percent, decimal, rating, duration)
 * - field type : text based (text, longtext, email, phone, url)
 * - field type : select based (single select, multi select)
 * - field type : date based (date, datetime, time)
 * - field type : virtual (link)
 * - field type : misc (checkbox, attachment, barcode, qrcode, json)
 * - bulk update
 * - bulk update-all
 * # Error handling
 *    - invalid table ID
 *    - invalid record ID
 *
 * Record delete
 * - default
 * - bulk delete
 * # Error handling
 *    - invalid table ID
 *    - invalid record ID
 */

import 'mocha';
import { UITypes, ViewTypes } from 'nocodb-sdk';
import { expect } from 'chai';
import request from 'supertest';
import init from '../../init';
import { createProject, createSakilaProject } from '../../factory/project';
import { createTable, getTable } from '../../factory/table';
import { createBulkRows, listRow, rowMixedValue } from '../../factory/row';
import { customColumns } from '../../factory/column';
import { createView, updateView } from '../../factory/view';
import type { Api } from 'nocodb-sdk';

import type { ColumnType } from 'nocodb-sdk';
import type Project from '../../../../src/models/Project';
import type Model from '../../../../src/models/Model';

let api: Api<any>;

const debugMode = true;

let context;
let project: Project;
let table: Model;
let columns: any[];
let insertedRecords: any[] = [];

let sakilaProject: Project;
let customerTable: Model;
let customerColumns;

// Optimisation scope for time reduction
// 1. BeforeEach can be changed to BeforeAll for List and Read APIs

///////////////////////////////////////////////////////////////////////////////
// Utility routines

const verifyColumnsInRsp = (row, columns: ColumnType[]) => {
  const responseColumnsListStr = Object.keys(row).sort().join(',');
  const expectedColumnsListStr = columns
    .map((c) => c.title)
    .sort()
    .join(',');

  return responseColumnsListStr === expectedColumnsListStr;
};

async function ncAxiosGet({
  url = `/api/v1/base/${project.id}/tables/${table.id}`,
  query = {},
  status = 200,
}: { url?: string; query?: any; status?: number } = {}) {
  const response = await request(context.app)
    .get(url)
    .set('xc-auth', context.token)
    .query(query)
    .send({});
  expect(response.status).to.equal(status);
  return response;
}
async function ncAxiosPost({
  url = `/api/v1/base/${project.id}/tables/${table.id}`,
  body = {},
  status = 200,
}: { url?: string; body?: any; status?: number } = {}) {
  const response = await request(context.app)
    .post(url)
    .set('xc-auth', context.token)
    .send(body);
  expect(response.status).to.equal(status);
  return response;
}
async function ncAxiosPatch({
  url = `/api/v1/base/${project.id}/tables/${table.id}`,
  body = {},
  status = 200,
}: { url?: string; body?: any; status?: number } = {}) {
  const response = await request(context.app)
    .patch(url)
    .set('xc-auth', context.token)
    .send(body);
  expect(response.status).to.equal(status);
  return response;
}
async function ncAxiosDelete({
  url = `/api/v1/base/${project.id}/tables/${table.id}`,
  body = {},
  status = 200,
}: { url?: string; body?: any; status?: number } = {}) {
  const response = await request(context.app)
    .delete(url)
    .set('xc-auth', context.token)
    .send(body);
  expect(response.status).to.equal(status);
  return response;
}

///////////////////////////////////////////////////////////////////////////////

// generic table, sakila based
function generalDb() {
  beforeEach(async function () {
    context = await init();

    sakilaProject = await createSakilaProject(context);
    project = await createProject(context);

    customerTable = await getTable({
      project: sakilaProject,
      name: 'customer',
    });
    customerColumns = await customerTable.getColumns();
  });
}

function textBased() {
  // prepare data for test cases
  beforeEach(async function () {
    context = await init(false);
    project = await createProject(context);
    table = await createTable(context, project, {
      table_name: 'textBased',
      title: 'TextBased',
      columns: customColumns('textBased'),
    });

    // retrieve column meta
    columns = await table.getColumns();

    // build records
    const rowAttributes = [];
    for (let i = 0; i < 400; i++) {
      const row = {
        SingleLineText: rowMixedValue(columns[1], i),
        MultiLineText: rowMixedValue(columns[2], i),
        Email: rowMixedValue(columns[3], i),
        Phone: rowMixedValue(columns[4], i),
        Url: rowMixedValue(columns[5], i),
      };
      rowAttributes.push(row);
    }

    // insert records
    // creating bulk records using older set of APIs
    await createBulkRows(context, {
      project,
      table,
      values: rowAttributes,
    });

    // retrieve inserted records
    insertedRecords = await listRow({ project, table });

    // verify length of unfiltered records to be 400
    expect(insertedRecords.length).to.equal(400);
  });

  /////////////////////////////////////////////////////////////////////////////

  // LIST
  //

  /////////////////////////////////////////////////////////////////////////////

  it('List: default', async function () {
    const rsp = await ncAxiosGet();

    const expectedPageInfo = {
      totalRows: 400,
      page: 1,
      pageSize: 25,
      isFirstPage: true,
      isLastPage: false,
    };
    expect(rsp.body.pageInfo).to.deep.equal(expectedPageInfo);
    expect(verifyColumnsInRsp(rsp.body.list[0], columns)).to.equal(true);
  });

  it('List: offset, limit', async function () {
    const rsp = await ncAxiosGet({ query: { offset: 200, limit: 100 } });

    const expectedPageInfo = {
      totalRows: 400,
      page: 3,
      pageSize: 100,
      isFirstPage: false,
      isLastPage: false,
    };
    expect(rsp.body.pageInfo).to.deep.equal(expectedPageInfo);
  });

  it('List: fields, single', async function () {
    const rsp = await ncAxiosGet({
      query: { fields: 'SingleLineText' },
    });

    expect(
      verifyColumnsInRsp(rsp.body.list[0], [{ title: 'SingleLineText' }]),
    ).to.equal(true);
  });

  it('List: fields, multiple', async function () {
    const rsp = await ncAxiosGet({
      query: { fields: ['SingleLineText', 'MultiLineText'] },
    });

    expect(
      verifyColumnsInRsp(rsp.body.list[0], [
        { title: 'SingleLineText' },
        { title: 'MultiLineText' },
      ]),
    ).to.equal(true);
  });

  it('List: sort, ascending', async function () {
    const sortColumn = columns.find((c) => c.title === 'SingleLineText');
    const rsp = await ncAxiosGet({
      query: { sort: 'SingleLineText', limit: 400 },
    });

    expect(verifyColumnsInRsp(rsp.body.list[0], columns)).to.equal(true);
    const sortedArray = rsp.body.list.map((r) => r[sortColumn.title]);
    expect(sortedArray).to.deep.equal(sortedArray.sort());
  });

  it('List: sort, descending', async function () {
    const sortColumn = columns.find((c) => c.title === 'SingleLineText');
    const rsp = await ncAxiosGet({
      query: { sort: '-SingleLineText', limit: 400 },
    });

    expect(verifyColumnsInRsp(rsp.body.list[0], columns)).to.equal(true);
    const descSortedArray = rsp.body.list.map((r) => r[sortColumn.title]);
    expect(descSortedArray).to.deep.equal(descSortedArray.sort().reverse());
  });

  it('List: sort, multiple', async function () {
    const rsp = await ncAxiosGet({
      query: {
        sort: ['-SingleLineText', '-MultiLineText'],
        limit: 400,
      },
    });

    expect(verifyColumnsInRsp(rsp.body.list[0], columns)).to.equal(true);
    // Combination of SingleLineText & MultiLineText should be in descending order
    const sortedArray = rsp.body.list.map(
      (r) => r.SingleLineText + r.MultiLineText,
    );
    expect(sortedArray).to.deep.equal(sortedArray.sort().reverse());
  });

  it('List: filter, single', async function () {
    const rsp = await ncAxiosGet({
      query: {
        where: '(SingleLineText,eq,Afghanistan)',
        limit: 400,
      },
    });

    expect(verifyColumnsInRsp(rsp.body.list[0], columns)).to.equal(true);
    const filteredArray = rsp.body.list.map((r) => r.SingleLineText);
    expect(filteredArray).to.deep.equal(filteredArray.fill('Afghanistan'));
  });

  it('List: filter, multiple', async function () {
    const rsp = await ncAxiosGet({
      query: {
        where:
          '(SingleLineText,eq,Afghanistan)~and(MultiLineText,eq,Allahabad, India)',
        limit: 400,
      },
    });

    expect(verifyColumnsInRsp(rsp.body.list[0], columns)).to.equal(true);
    const filteredArray = rsp.body.list.map(
      (r) => r.SingleLineText + ' ' + r.MultiLineText,
    );
    expect(filteredArray).to.deep.equal(
      filteredArray.fill('Afghanistan Allahabad, India'),
    );
  });

  it('List: view ID', async function () {
    const gridView = await createView(context, {
      title: 'grid0',
      table,
      type: ViewTypes.GRID,
    });

    const fk_column_id = columns.find((c) => c.title === 'SingleLineText').id;
    await updateView(context, {
      table,
      view: gridView,
      filter: [
        {
          comparison_op: 'eq',
          fk_column_id,
          logical_op: 'or',
          value: 'Afghanistan',
        },
      ],
    });

    // fetch records from view
    let rsp = await ncAxiosGet({ query: { viewId: gridView.id } });
    expect(rsp.body.pageInfo.totalRows).to.equal(31);

    await updateView(context, {
      table,
      view: gridView,
      filter: [
        {
          comparison_op: 'eq',
          fk_column_id,
          logical_op: 'or',
          value: 'Austria',
        },
      ],
    });

    // fetch records from view
    rsp = await ncAxiosGet({
      query: {
        viewId: gridView.id,
      },
    });
    expect(rsp.body.pageInfo.totalRows).to.equal(61);

    // Sort by SingleLineText
    await updateView(context, {
      table,
      view: gridView,
      sort: [
        {
          direction: 'asc',
          fk_column_id,
          push_to_top: true,
        },
      ],
    });

    // fetch records from view
    rsp = await ncAxiosGet({
      query: {
        viewId: gridView.id,
      },
    });
    expect(rsp.body.pageInfo.totalRows).to.equal(61);

    // verify sorted order
    // Would contain all 'Afghanistan' as we have 31 records for it
    expect(verifyColumnsInRsp(rsp.body.list[0], columns)).to.equal(true);
    const filteredArray = rsp.body.list.map((r) => r.SingleLineText);
    expect(filteredArray).to.deep.equal(filteredArray.fill('Afghanistan'));

    await updateView(context, {
      table,
      view: gridView,
      field: ['SingleLineText'],
    });

    // fetch records from view
    rsp = await ncAxiosGet({
      query: {
        viewId: gridView.id,
      },
    });
    const displayColumns = columns.filter((c) => c.title !== 'SingleLineText');
    expect(verifyColumnsInRsp(rsp.body.list[0], displayColumns)).to.equal(true);
  });

  async function prepareViewForTests() {
    const gridView = await createView(context, {
      title: 'grid0',
      table,
      type: ViewTypes.GRID,
    });

    const fk_column_id = columns.find((c) => c.title === 'SingleLineText').id;
    await updateView(context, {
      table,
      view: gridView,
      filter: [
        {
          comparison_op: 'eq',
          fk_column_id,
          logical_op: 'or',
          value: 'Afghanistan',
        },
        {
          comparison_op: 'eq',
          fk_column_id,
          logical_op: 'or',
          value: 'Austria',
        },
      ],
      sort: [
        {
          direction: 'asc',
          fk_column_id,
          push_to_top: true,
        },
      ],
      field: ['MultiLineText', 'Email'],
    });

    // fetch records from view
    const rsp = await ncAxiosGet({ query: { viewId: gridView.id } });
    expect(rsp.body.pageInfo.totalRows).to.equal(61);
    const displayColumns = columns.filter(
      (c) => c.title !== 'MultiLineText' && c.title !== 'Email',
    );
    expect(verifyColumnsInRsp(rsp.body.list[0], displayColumns)).to.equal(true);
    return gridView;
  }

  it('List: view ID + sort', async function () {
    const gridView = await prepareViewForTests();

    const rsp = await ncAxiosGet({
      query: {
        viewId: gridView.id,
        sort: 'Url',
        limit: 100,
      },
    });
    const displayColumns = columns.filter(
      (c) => c.title !== 'MultiLineText' && c.title !== 'Email',
    );
    expect(rsp.body.pageInfo.totalRows).to.equal(61);
    expect(verifyColumnsInRsp(rsp.body.list[0], displayColumns)).to.equal(true);
    const sortedArray = rsp.body.list.map((r) => r['Url']);
    expect(sortedArray).to.deep.equal(sortedArray.sort());
  });

  it('List: view ID + filter', async function () {
    const gridView = await prepareViewForTests();

    const rsp = await ncAxiosGet({
      query: {
        viewId: gridView.id,
        where: '(Phone,eq,1-541-754-3010)',
        limit: 100,
      },
    });
    const displayColumns = columns.filter(
      (c) => c.title !== 'MultiLineText' && c.title !== 'Email',
    );
    expect(rsp.body.pageInfo.totalRows).to.equal(7);
    expect(verifyColumnsInRsp(rsp.body.list[0], displayColumns)).to.equal(true);
    const filteredArray = rsp.body.list.map((r) => r['Phone']);
    expect(filteredArray).to.deep.equal(filteredArray.fill('1-541-754-3010'));
  });

  it('List: view ID + fields', async function () {
    const gridView = await prepareViewForTests();

    const rsp = await ncAxiosGet({
      query: {
        viewId: gridView.id,
        fields: ['Phone', 'MultiLineText', 'SingleLineText', 'Email'],
        limit: 100,
      },
    });
    expect(rsp.body.pageInfo.totalRows).to.equal(61);
    expect(
      verifyColumnsInRsp(rsp.body.list[0], [
        { title: 'Phone' },
        { title: 'SingleLineText' },
      ]),
    ).to.equal(true);
  });

  // Error handling
  it('List: invalid ID', async function () {
    // Invalid table ID
    await ncAxiosGet({
      url: `/api/v1/base/${project.id}/tables/123456789`,
      status: 404,
    });
    // Invalid project ID
    await ncAxiosGet({
      url: `/api/v1/base/123456789/tables/123456789`,
      status: 404,
    });
    // Invalid view ID
    await ncAxiosGet({
      query: {
        viewId: '123456789',
      },
      status: 422,
    });
  });

  it('List: invalid limit & offset', async function () {
    // Invalid limit
    await ncAxiosGet({
      query: {
        limit: -100,
      },
      status: 200,
    });
    await ncAxiosGet({
      query: {
        limit: 'abc',
      },
      status: 200,
    });

    // Invalid offset
    await ncAxiosGet({
      query: {
        offset: -100,
      },
      status: 200,
    });
    await ncAxiosGet({
      query: {
        offset: 'abc',
      },
      status: 200,
    });
    await ncAxiosGet({
      query: {
        offset: 10000,
      },
      status: 422,
    });
  });

  it('List: invalid sort, filter, fields', async function () {
    await ncAxiosGet({
      query: {
        sort: 'abc',
      },
    });
    await ncAxiosGet({
      query: {
        where: 'abc',
      },
    });
    await ncAxiosGet({
      query: {
        fields: 'abc',
      },
    });
  });

  /////////////////////////////////////////////////////////////////////////////

  // CREATE
  //

  /////////////////////////////////////////////////////////////////////////////
  const newRecord = {
    SingleLineText: 'abc',
    MultiLineText: 'abc abc \n abc \r abc \t abc 1234!@#$%^&*()_+',
    Email: 'a@b.com',
    Url: 'https://www.abc.com',
    Phone: '1-234-567-8910',
  };

  it('Create: all fields', async function () {
    const rsp = await ncAxiosPost({ body: newRecord });

    expect(rsp.body).to.deep.equal({
      Id: 401,
      ...newRecord,
    });
  });

  it('Create: few fields left out', async function () {
    const newRecord = {
      SingleLineText: 'abc',
      MultiLineText: 'abc abc \n abc \r abc \t abc 1234!@#$%^&*()_+',
    };
    const rsp = await ncAxiosPost({ body: newRecord });

    // fields left out should be null
    expect(rsp.body).to.deep.equal({
      Id: 401,
      ...newRecord,
      Email: null,
      Url: null,
      Phone: null,
    });
  });

  it('Create: bulk', async function () {
    const rsp = await ncAxiosPost({ body: [newRecord, newRecord, newRecord] });

    expect(rsp.body).to.deep.equal([{ Id: 401 }, { Id: 402 }, { Id: 403 }]);
  });

  // Error handling
  it('Create: invalid ID', async function () {
    // Invalid table ID
    await ncAxiosPost({
      url: `/api/v1/base/${project.id}/tables/123456789`,
      status: 404,
    });
    // Invalid project ID
    await ncAxiosPost({
      url: `/api/v1/base/123456789/tables/123456789`,
      status: 404,
    });
    // Invalid data - create should not specify ID
    await ncAxiosPost({
      body: { ...newRecord, Id: 300 },
      status: 422,
    });
    // Invalid data - number instead of string
    // await ncAxiosPost({
    //   body: { ...newRecord, SingleLineText: 300 },
    //   status: 400,
    // });
  });

  // TBD : default value handling

  /////////////////////////////////////////////////////////////////////////////

  // READ
  //

  /////////////////////////////////////////////////////////////////////////////

  it('Read: all fields', async function () {
    const rsp = await ncAxiosGet({
      url: `/api/v1/base/tables/${table.id}/rows/100`,
    });
  });

  it('Read: invalid ID', async function () {
    // Invalid table ID
    await ncAxiosGet({
      url: `/api/v1/base/tables/123456789/rows/100`,
      status: 404,
    });
    // Invalid row ID
    await ncAxiosGet({
      url: `/api/v1/base/tables/${table.id}/rows/1000`,
      status: 404,
    });
  });

  /////////////////////////////////////////////////////////////////////////////

  // UPDATE
  //

  /////////////////////////////////////////////////////////////////////////////

  it('Update: all fields', async function () {
    const rsp = await ncAxiosPatch({
      body: [
        {
          Id: 1,
          ...newRecord,
        },
      ],
    });
    expect(rsp.body).to.deep.equal([
      {
        Id: '1',
      },
    ]);
  });

  it('Update: partial', async function () {
    const recordBeforeUpdate = await ncAxiosGet({
      url: `/api/v1/base/tables/${table.id}/rows/1`,
    });

    const rsp = await ncAxiosPatch({
      body: [
        {
          Id: 1,
          SingleLineText: 'some text',
          MultiLineText: 'some more text',
        },
      ],
    });
    expect(rsp.body).to.deep.equal([
      {
        Id: '1',
      },
    ]);

    const recordAfterUpdate = await ncAxiosGet({
      url: `/api/v1/base/tables/${table.id}/rows/1`,
    });
    expect(recordAfterUpdate.body).to.deep.equal({
      ...recordBeforeUpdate.body,
      SingleLineText: 'some text',
      MultiLineText: 'some more text',
    });
  });

  it('Update: bulk', async function () {
    const rsp = await ncAxiosPatch({
      body: [
        {
          Id: 1,
          SingleLineText: 'some text',
          MultiLineText: 'some more text',
        },
        {
          Id: 2,
          SingleLineText: 'some text',
          MultiLineText: 'some more text',
        },
      ],
    });
    expect(rsp.body).to.deep.equal([{ Id: '1' }, { Id: '2' }]);
  });

  // Error handling

  it('Update: invalid ID', async function () {
    // Invalid project ID
    await ncAxiosPatch({
      url: `/api/v1/base/123456789/tables/${table.id}`,
      status: 404,
    });
    // Invalid table ID
    await ncAxiosPatch({
      url: `/api/v1/base/${project.id}/tables/123456789`,
      status: 404,
    });
    // Invalid row ID
    await ncAxiosPatch({
      body: { Id: 123456789, SingleLineText: 'some text' },
      status: 422,
    });
  });

  /////////////////////////////////////////////////////////////////////////////

  // DELETE
  //

  /////////////////////////////////////////////////////////////////////////////

  it('Delete: single', async function () {
    const rsp = await ncAxiosDelete({ body: [{ Id: 1 }] });
    expect(rsp.body).to.deep.equal([{ Id: '1' }]);

    // // check that it's gone
    await ncAxiosGet({
      url: `/api/v1/base/tables/${table.id}/rows/1`,
      status: 404,
    });
  });

  it('Delete: bulk', async function () {
    const rsp = await ncAxiosDelete({ body: [{ Id: 1 }, { Id: 2 }] });
    expect(rsp.body).to.deep.equal([{ Id: '1' }, { Id: '2' }]);

    // check that it's gone
    await ncAxiosGet({
      url: `/api/v1/base/tables/${table.id}/rows/1`,
      status: 404,
    });
    await ncAxiosGet({
      url: `/api/v1/base/tables/${table.id}/rows/2`,
      status: 404,
    });
  });

  // Error handling

  it('Delete: invalid ID', async function () {
    // Invalid project ID
    await ncAxiosDelete({
      url: `/api/v1/base/123456789/tables/${table.id}`,
      status: 404,
    });
    // Invalid table ID
    await ncAxiosDelete({
      url: `/api/v1/base/${project.id}/tables/123456789`,
      status: 404,
    });
    // Invalid row ID
    await ncAxiosDelete({ body: { Id: 123456789 }, status: 422 });
  });
}

function numberBased() {
  // prepare data for test cases
  beforeEach(async function () {
    context = await init();
    project = await createProject(context);
    table = await createTable(context, project, {
      table_name: 'numberBased',
      title: 'numberBased',
      columns: customColumns('numberBased'),
    });

    // retrieve column meta
    columns = await table.getColumns();

    // build records
    const rowAttributes = [];
    for (let i = 0; i < 400; i++) {
      const row = {
        Number: rowMixedValue(columns[1], i),
        Decimal: rowMixedValue(columns[2], i),
        Currency: rowMixedValue(columns[3], i),
        Percent: rowMixedValue(columns[4], i),
        Duration: rowMixedValue(columns[5], i),
        Rating: rowMixedValue(columns[6], i),
      };
      rowAttributes.push(row);
    }

    // insert records
    await createBulkRows(context, {
      project,
      table,
      values: rowAttributes,
    });

    // retrieve inserted records
    insertedRecords = await listRow({ project, table });

    // verify length of unfiltered records to be 400
    expect(insertedRecords.length).to.equal(400);
  });

  const records = [
    {
      Id: 1,
      Number: 33,
      Decimal: 33.3,
      Currency: 33.3,
      Percent: 33,
      Duration: 10,
      Rating: 0,
    },
    {
      Id: 2,
      Number: null,
      Decimal: 456.34,
      Currency: 456.34,
      Percent: null,
      Duration: 20,
      Rating: 1,
    },
    {
      Id: 3,
      Number: 456,
      Decimal: 333.3,
      Currency: 333.3,
      Percent: 456,
      Duration: 30,
      Rating: 2,
    },
    {
      Id: 4,
      Number: 333,
      Decimal: null,
      Currency: null,
      Percent: 333,
      Duration: 40,
      Rating: 3,
    },
    {
      Id: 5,
      Number: 267,
      Decimal: 267.5674,
      Currency: 267.5674,
      Percent: 267,
      Duration: 50,
      Rating: null,
    },
    {
      Id: 6,
      Number: 34,
      Decimal: 34,
      Currency: 34,
      Percent: 34,
      Duration: 60,
      Rating: 0,
    },
    {
      Id: 7,
      Number: 8754,
      Decimal: 8754,
      Currency: 8754,
      Percent: 8754,
      Duration: null,
      Rating: 4,
    },
    {
      Id: 8,
      Number: 3234,
      Decimal: 3234.547,
      Currency: 3234.547,
      Percent: 3234,
      Duration: 70,
      Rating: 5,
    },
    {
      Id: 9,
      Number: 44,
      Decimal: 44.2647,
      Currency: 44.2647,
      Percent: 44,
      Duration: 80,
      Rating: 0,
    },
    {
      Id: 10,
      Number: 33,
      Decimal: 33.98,
      Currency: 33.98,
      Percent: 33,
      Duration: 90,
      Rating: 1,
    },
  ];

  it('Number based- List & CRUD', async function () {
    // list 10 records
    let rsp = await ncAxiosGet({
      query: {
        limit: 10,
      },
    });
    const pageInfo = {
      totalRows: 400,
      page: 1,
      pageSize: 10,
      isFirstPage: true,
      isLastPage: false,
    };
    expect(rsp.body.pageInfo).to.deep.equal(pageInfo);
    expect(rsp.body.list).to.deep.equal(records);

    ///////////////////////////////////////////////////////////////////////////

    // insert 10 records
    // remove Id's from record array
    records.forEach((r) => delete r.Id);
    rsp = await ncAxiosPost({
      body: records,
    });

    // prepare array with 10 Id's, from 401 to 410
    const ids = [];
    for (let i = 401; i <= 410; i++) {
      ids.push({ Id: i });
    }
    expect(rsp.body).to.deep.equal(ids);

    ///////////////////////////////////////////////////////////////////////////

    // read record with Id 401
    rsp = await ncAxiosGet({
      url: `/api/v1/base/${project.id}/tables/${table.id}/rows/401`,
    });
    expect(rsp.body).to.deep.equal(records[0]);

    ///////////////////////////////////////////////////////////////////////////

    // update record with Id 401 to 404
    const updatedRecord = {
      Number: 55,
      Decimal: 55.5,
      Currency: 55.5,
      Percent: 55,
      Duration: 55,
      Rating: 5,
    };
    const updatedRecords = [
      {
        id: 401,
        ...updatedRecord,
      },
      {
        id: 402,
        ...updatedRecord,
      },
      {
        id: 403,
        ...updatedRecord,
      },
      {
        id: 404,
        ...updatedRecord,
      },
    ];
    rsp = await ncAxiosPatch({
      body: updatedRecords,
    });
    expect(rsp.body).to.deep.equal(
      updatedRecords.map((record) => ({ id: record.id })),
    );

    // verify updated records
    rsp = await ncAxiosGet({
      query: {
        limit: 4,
        offset: 400,
      },
    });
    expect(rsp.body.list).to.deep.equal(updatedRecords);

    ///////////////////////////////////////////////////////////////////////////

    // delete record with ID 401 to 404
    rsp = await ncAxiosDelete({
      body: updatedRecords.map((record) => ({ id: record.id })),
    });
    expect(rsp.body).to.deep.equal(
      updatedRecords.map((record) => ({ id: record.id })),
    );
  });
}

function selectBased() {
  // prepare data for test cases
  beforeEach(async function () {
    context = await init();
    project = await createProject(context);
    table = await createTable(context, project, {
      table_name: 'selectBased',
      title: 'selectBased',
      columns: customColumns('selectBased'),
    });

    // retrieve column meta
    columns = await table.getColumns();

    // build records
    const rowAttributes = [];
    for (let i = 0; i < 400; i++) {
      const row = {
        SingleSelect: rowMixedValue(columns[1], i),
        MultiSelect: rowMixedValue(columns[2], i),
      };
      rowAttributes.push(row);
    }

    // insert records
    await createBulkRows(context, {
      project,
      table,
      values: rowAttributes,
    });

    // retrieve inserted records
    insertedRecords = await listRow({ project, table });

    // verify length of unfiltered records to be 400
    expect(insertedRecords.length).to.equal(400);
  });
}

function dateBased() {
  // prepare data for test cases
  beforeEach(async function () {
    context = await init();
    project = await createProject(context);
    table = await createTable(context, project, {
      table_name: 'dateBased',
      title: 'dateBased',
      columns: customColumns('dateBased'),
    });

    // retrieve column meta
    columns = await table.getColumns();

    // build records
    // 800: one year before to one year after
    const rowAttributes = [];
    for (let i = 0; i < 800; i++) {
      const row = {
        Date: rowMixedValue(columns[1], i),
      };
      rowAttributes.push(row);
    }

    // insert records
    await createBulkRows(context, {
      project,
      table,
      values: rowAttributes,
    });

    // retrieve inserted records
    insertedRecords = await listRow({ project, table });

    // verify length of unfiltered records to be 800
    expect(insertedRecords.length).to.equal(800);
  });
}

///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////

export default function () {
  // describe('General', generalDb);
  describe('Text based', textBased);
  // describe('Numerical', numberBased);
  // describe('Select based', selectBased);
  // describe('Date based', dateBased);
}

///////////////////////////////////////////////////////////////////////////////