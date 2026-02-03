import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 验证迁移结果 ===\n');

  // 检查 families 表
  const families = await prisma.family.findMany();
  console.log(`Families 表: ${families.length} 条记录`);
  families.forEach(f => {
    console.log(`  - ${f.name} (邀请码: ${f.inviteCode})`);
  });

  // 检查 users 表
  const users = await prisma.user.findMany({
    include: { family: true }
  });
  console.log(`\nUsers 表: ${users.length} 条记录`);
  users.forEach(u => {
    console.log(`  - ${u.name} (${u.email}), 家庭: ${u.family?.name || '无'}, 是创建者: ${u.isOwner}`);
  });

  // 检查 family_members 表
  const members = await prisma.familyMember.findMany({
    include: { family: true }
  });
  console.log(`\nFamilyMembers 表: ${members.length} 条记录`);
  members.forEach(m => {
    console.log(`  - ${m.name}, 家庭: ${m.family.name}`);
  });

  // 检查 chat_sessions 表
  const sessions = await prisma.chatSession.findMany({
    include: { family: true }
  });
  console.log(`\nChatSessions 表: ${sessions.length} 条记录`);
  sessions.forEach(s => {
    console.log(`  - ${s.title}, 家庭: ${s.family.name}, 创建者: ${s.createdBy}`);
  });

  console.log('\n=== 迁移验证完成 ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
