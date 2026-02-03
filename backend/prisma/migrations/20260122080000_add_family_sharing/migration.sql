-- 家庭数据共享功能迁移
-- 将系统从用户中心架构改为家庭中心架构

-- 1. 创建 families 表
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "invite_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引
CREATE UNIQUE INDEX "families_invite_code_key" ON "families"("invite_code");

-- 2. 为 users 表添加新列
ALTER TABLE "users" ADD COLUMN "family_id" TEXT;
ALTER TABLE "users" ADD COLUMN "is_owner" BOOLEAN NOT NULL DEFAULT false;

-- 3. 为每个现有用户创建一个家庭
DO $$
DECLARE
    user_record RECORD;
    new_family_id TEXT;
    invite_code TEXT;
BEGIN
    FOR user_record IN SELECT id, name, email FROM users LOOP
        -- 生成 UUID 作为家庭 ID
        new_family_id := gen_random_uuid()::TEXT;

        -- 生成 8 位邀请码 (大写字母+数字)
        invite_code := upper(substring(md5(random()::text) from 1 for 8));

        -- 创建家庭
        INSERT INTO families (id, name, invite_code, created_at, updated_at)
        VALUES (
            new_family_id,
            user_record.name || '的家庭',
            invite_code,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );

        -- 关联用户到家庭，并设置为创建者
        UPDATE users
        SET family_id = new_family_id, is_owner = true
        WHERE id = user_record.id;
    END LOOP;
END $$;

-- 4. 为 family_members 表添加 family_id 列
ALTER TABLE "family_members" ADD COLUMN "family_id" TEXT;

-- 5. 迁移 family_members 数据：根据 user_id 找到对应的 family_id
UPDATE family_members fm
SET family_id = u.family_id
FROM users u
WHERE fm.user_id = u.id;

-- 6. 为 chat_sessions 表添加新列
ALTER TABLE "chat_sessions" ADD COLUMN "family_id" TEXT;
ALTER TABLE "chat_sessions" ADD COLUMN "created_by" TEXT;

-- 7. 迁移 chat_sessions 数据
UPDATE chat_sessions cs
SET family_id = u.family_id, created_by = cs.user_id
FROM users u
WHERE cs.user_id = u.id;

-- 8. 删除旧的外键约束
ALTER TABLE "family_members" DROP CONSTRAINT IF EXISTS "family_members_user_id_fkey";
ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "chat_sessions_user_id_fkey";

-- 9. 删除旧列
ALTER TABLE "family_members" DROP COLUMN "user_id";
ALTER TABLE "chat_sessions" DROP COLUMN "user_id";

-- 10. 添加 NOT NULL 约束
ALTER TABLE "family_members" ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "chat_sessions" ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "chat_sessions" ALTER COLUMN "created_by" SET NOT NULL;

-- 11. 添加外键约束
ALTER TABLE "users" ADD CONSTRAINT "users_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. 创建索引
CREATE INDEX "users_family_id_idx" ON "users"("family_id");
CREATE INDEX "family_members_family_id_idx" ON "family_members"("family_id");
CREATE INDEX "family_members_family_id_deleted_at_idx" ON "family_members"("family_id", "deleted_at");
CREATE INDEX "chat_sessions_family_id_idx" ON "chat_sessions"("family_id");

-- 13. 删除旧索引
DROP INDEX IF EXISTS "family_members_user_id_idx";
DROP INDEX IF EXISTS "family_members_user_id_deleted_at_idx";
DROP INDEX IF EXISTS "chat_sessions_user_id_idx";
