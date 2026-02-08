import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Typography,
  Space,
  Switch,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { vaccinationsApi, membersApi } from '../../api';
import { ALL_VACCINES, getVaccineByCode } from '../../data/vaccine-definitions';
import type { CreateVaccineRecordRequest } from '../../types/vaccination';
import styles from './Vaccinations.module.css';

const { Title } = Typography;

export default function VaccinationAdd() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isCustom, setIsCustom] = useState(false);

  // 获取家庭成员列表
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  // 创建接种记录
  const createMutation = useMutation({
    mutationFn: vaccinationsApi.createRecord,
    onSuccess: () => {
      message.success('接种记录添加成功');
      queryClient.invalidateQueries({ queryKey: ['vaccination-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['vaccination-summary'] });
      navigate('/vaccinations');
    },
    onError: (error: Error) => {
      message.error(error.message || '添加失败');
    },
  });

  // 选择预定义疫苗时自动填充信息
  const handleVaccineSelect = (code: string) => {
    const vaccine = getVaccineByCode(code);
    if (vaccine) {
      form.setFieldsValue({
        vaccineName: vaccine.name,
        totalDoses: vaccine.totalDoses,
      });
    }
  };

  // 提交表单
  const handleSubmit = (values: Record<string, unknown>) => {
    const data: CreateVaccineRecordRequest = {
      memberId: values.memberId as string,
      vaccineCode: isCustom ? undefined : (values.vaccineCode as string),
      vaccineName: values.vaccineName as string,
      doseNumber: values.doseNumber as number,
      totalDoses: values.totalDoses as number | undefined,
      vaccinatedAt: (values.vaccinatedAt as dayjs.Dayjs).format('YYYY-MM-DD'),
      location: values.location as string | undefined,
      manufacturer: values.manufacturer as string | undefined,
      batchNumber: values.batchNumber as string | undefined,
      notes: values.notes as string | undefined,
    };

    createMutation.mutate(data);
  };

  return (
    <div className={styles.formContainer}>
      <Space>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/vaccinations')}
        >
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>添加接种记录</Title>
      </Space>

      <Card className={styles.formCard}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            doseNumber: 1,
            vaccinatedAt: dayjs(),
          }}
        >
          {/* 选择成员 */}
          <Form.Item
            name="memberId"
            label="家庭成员"
            rules={[{ required: true, message: '请选择家庭成员' }]}
          >
            <Select
              placeholder="请选择家庭成员"
              options={members.map((m) => ({ label: m.name, value: m.id }))}
            />
          </Form.Item>

          {/* 自定义疫苗开关 */}
          <Form.Item label="疫苗类型">
            <Space>
              <Switch
                checked={isCustom}
                onChange={(checked) => {
                  setIsCustom(checked);
                  if (checked) {
                    form.setFieldsValue({
                      vaccineCode: undefined,
                      vaccineName: '',
                      totalDoses: undefined,
                    });
                  }
                }}
              />
              <span>{isCustom ? '自定义疫苗' : '预定义疫苗'}</span>
            </Space>
          </Form.Item>

          {/* 预定义疫苗选择 */}
          {!isCustom && (
            <Form.Item
              name="vaccineCode"
              label="选择疫苗"
              rules={[{ required: !isCustom, message: '请选择疫苗' }]}
            >
              <Select
                placeholder="请选择疫苗"
                showSearch
                optionFilterProp="label"
                onChange={handleVaccineSelect}
                options={[
                  {
                    label: '儿童计划免疫',
                    options: ALL_VACCINES.filter((v) => v.category === 'CHILD').map((v) => ({
                      label: `${v.name} (${v.totalDoses}剂)`,
                      value: v.code,
                    })),
                  },
                  {
                    label: '成人疫苗',
                    options: ALL_VACCINES.filter((v) => v.category === 'ADULT').map((v) => ({
                      label: `${v.name} (${v.totalDoses}剂)`,
                      value: v.code,
                    })),
                  },
                  {
                    label: '老年人疫苗',
                    options: ALL_VACCINES.filter((v) => v.category === 'ELDERLY').map((v) => ({
                      label: `${v.name} (${v.totalDoses}剂)`,
                      value: v.code,
                    })),
                  },
                ]}
              />
            </Form.Item>
          )}

          {/* 疫苗名称（自定义时手动输入） */}
          <Form.Item
            name="vaccineName"
            label="疫苗名称"
            rules={[{ required: true, message: '请输入疫苗名称' }]}
          >
            <Input
              placeholder="请输入疫苗名称"
              disabled={!isCustom}
            />
          </Form.Item>

          {/* 剂次信息 */}
          <Space style={{ display: 'flex' }}>
            <Form.Item
              name="doseNumber"
              label="第几剂"
              rules={[{ required: true, message: '请输入剂次' }]}
            >
              <InputNumber min={1} max={10} style={{ width: 100 }} />
            </Form.Item>

            <Form.Item
              name="totalDoses"
              label="共几剂"
            >
              <InputNumber
                min={1}
                max={10}
                style={{ width: 100 }}
                disabled={!isCustom}
                placeholder="可选"
              />
            </Form.Item>
          </Space>

          {/* 接种日期 */}
          <Form.Item
            name="vaccinatedAt"
            label="接种日期"
            rules={[{ required: true, message: '请选择接种日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          {/* 接种地点 */}
          <Form.Item name="location" label="接种地点">
            <Input placeholder="如：XX社区卫生服务中心" />
          </Form.Item>

          {/* 疫苗厂商 */}
          <Form.Item name="manufacturer" label="疫苗厂商">
            <Input placeholder="可选" />
          </Form.Item>

          {/* 批号 */}
          <Form.Item name="batchNumber" label="疫苗批号">
            <Input placeholder="可选" />
          </Form.Item>

          {/* 备注 */}
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>

          {/* 操作按钮 */}
          <div className={styles.formActions}>
            <Button onClick={() => navigate('/vaccinations')}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
            >
              保存
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
