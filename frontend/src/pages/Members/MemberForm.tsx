import { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Spin,
  Checkbox,
  message,
  Grid,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { CreateMemberRequest, Relationship, Gender, BloodType } from '../../types';
import { RelationshipLabels, GenderLabels, BloodTypeLabels } from '../../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { useBreakpoint } = Grid;

interface MemberFormProps {
  mode: 'add' | 'edit';
}

const MemberForm: React.FC<MemberFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const user = useAuthStore((s) => s.user);

  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.getById(id!),
    enabled: mode === 'edit' && !!id,
  });

  // 查询当前用户是否已关联成员（仅新建时需要）
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
    enabled: mode === 'add',
  });

  const currentUserLinked = members?.some((m) => m.userId === user?.id);

  useEffect(() => {
    if (member && mode === 'edit') {
      form.setFieldsValue({
        ...member,
        birthDate: dayjs(member.birthDate),
      });
    }
  }, [member, mode, form]);

  // 当选择 SELF 关系时自动勾选"关联到我"
  const relationship = Form.useWatch('relationship', form);
  useEffect(() => {
    if (mode === 'add' && relationship === 'SELF' && !currentUserLinked) {
      form.setFieldValue('linkToCurrentUser', true);
    }
  }, [relationship, mode, currentUserLinked, form]);

  const createMutation = useMutation({
    mutationFn: membersApi.create,
    onSuccess: () => {
      message.success('添加成功');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      navigate('/members');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '添加失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateMemberRequest) => membersApi.update(id!, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      navigate('/members');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '更新失败');
    },
  });

  const onFinish = (values: Record<string, unknown>) => {
    const data: CreateMemberRequest = {
      name: values.name as string,
      relationship: values.relationship as Relationship,
      gender: values.gender as Gender,
      birthDate: (values.birthDate as dayjs.Dayjs).format('YYYY-MM-DD'),
      bloodType: values.bloodType as BloodType | undefined,
      height: values.height as number | undefined,
      weight: values.weight as number | undefined,
      chronicDiseases: values.chronicDiseases as string[] | undefined,
      allergies: values.allergies as string | undefined,
      notes: values.notes as string | undefined,
      linkToCurrentUser: values.linkToCurrentUser as boolean | undefined,
    };

    if (mode === 'add') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  if (mode === 'edit' && isLoadingMember) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>
        {mode === 'add' ? '添加家庭成员' : '编辑家庭成员'}
      </h2>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            bloodType: 'UNKNOWN',
          }}
        >
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="relationship"
                label="关系"
                rules={[{ required: true, message: '请选择关系' }]}
              >
                <Select placeholder="请选择关系">
                  {(Object.keys(RelationshipLabels) as Relationship[]).map((key) => (
                    <Select.Option key={key} value={key}>
                      {RelationshipLabels[key]}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="gender"
                label="性别"
                rules={[{ required: true, message: '请选择性别' }]}
              >
                <Select placeholder="请选择性别">
                  {(Object.keys(GenderLabels) as Gender[]).map((key) => (
                    <Select.Option key={key} value={key}>
                      {GenderLabels[key]}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="birthDate"
                label="出生日期"
                rules={[{ required: true, message: '请选择出生日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择出生日期"
                  inputReadOnly={isMobile}
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={8}>
              <Form.Item name="bloodType" label="血型">
                <Select placeholder="请选择血型">
                  {(Object.keys(BloodTypeLabels) as BloodType[]).map((key) => (
                    <Select.Option key={key} value={key}>
                      {BloodTypeLabels[key]}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="height" label="身高 (cm)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入身高"
                  min={0}
                  max={300}
                  precision={1}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="weight" label="体重 (kg)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入体重"
                  min={0}
                  max={500}
                  precision={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="chronicDiseases" label="慢性病史">
            <Select
              mode="tags"
              placeholder="输入后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="allergies" label="过敏史">
            <TextArea rows={2} placeholder="请输入过敏史" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          {mode === 'add' && !currentUserLinked && (
            <Form.Item name="linkToCurrentUser" valuePropName="checked">
              <Checkbox>这个成员是我本人（关联到当前账号）</Checkbox>
            </Form.Item>
          )}

          <Form.Item>
            <div style={{ display: 'flex', gap: 16 }}>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                {mode === 'add' ? '添加' : '保存'}
              </Button>
              <Button onClick={() => navigate('/members')}>取消</Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default MemberForm;
