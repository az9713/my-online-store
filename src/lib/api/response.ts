import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function listResponse<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
  status = 200
) {
  return NextResponse.json({ data, pagination }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400
) {
  return NextResponse.json({ error: { code, message } }, { status });
}
