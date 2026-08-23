import { ok } from "../lib/api-response.js";
import { reportsService } from "../services/reports.service.js";
import type { CreateReportInput, ReportListQuery } from "@workdeal/shared";

export const reportsController = {
  async create(userId: string, input: CreateReportInput) {
    const row = await reportsService.create(userId, input);
    return { body: ok(row), status: 201 as const };
  },
  async list(query: ReportListQuery) {
    const result = await reportsService.list(query);
    return { body: ok(result.items, { total: result.total, page: result.page, limit: result.limit }), status: 200 as const };
  },
  async updateStatus(id: string, status: "resolved" | "dismissed") {
    const row = await reportsService.updateStatus(id, status);
    return { body: ok(row), status: 200 as const };
  },
};
