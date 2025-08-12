// src/services/auditService.ts
import AuditLog from '../models/AuditLog';

export const createAuditLog = async (logData: any) => {
  try {
    const auditLog = new AuditLog({
      ...logData,
      timestamp: new Date()
    });
    await auditLog.save();
    console.log(`📝 Audit log created: ${logData.action} by user ${logData.userId}`);
  } catch (error) {
    console.error('❌ Audit log error:', error);
  }
};