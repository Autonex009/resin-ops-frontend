"use server";

import {
  importSalesCommitments as apiImportSalesCommitments,
  importPlantCapacity as apiImportPlantCapacity,
  importDailyOutput as apiImportDailyOutput,
  importPlanningCapacityMaster as apiImportPlanningCapacityMaster,
  type ImportResult,
} from "@/lib/api-client";

export type { ImportResult };

function readFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

export async function importSalesCommitments(formData: FormData): Promise<ImportResult> {
  if (!readFile(formData)) return { success: false, message: "No file selected." };
  return apiImportSalesCommitments(formData);
}

export async function importPlantCapacity(formData: FormData): Promise<ImportResult> {
  if (!readFile(formData)) return { success: false, message: "No file selected." };
  return apiImportPlantCapacity(formData);
}

export async function importDailyOutput(formData: FormData): Promise<ImportResult> {
  if (!readFile(formData)) return { success: false, message: "No file selected." };
  return apiImportDailyOutput(formData);
}

export async function importPlanningCapacityMaster(formData: FormData): Promise<ImportResult> {
  if (!readFile(formData)) return { success: false, message: "No file selected." };
  return apiImportPlanningCapacityMaster(formData);
}
