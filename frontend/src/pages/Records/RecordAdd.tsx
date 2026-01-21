import { useState } from 'react';
import {
  Form,
  Select,
  DatePicker,
  Button,
  Card,
  InputNumber,
  message,
  Space,
  Divider,
  Radio,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi, membersApi } from '../../api';
import type { RecordType, MeasurementContext, RecordItem } from '../../types';
import {
  RecordTypeLabels,
  RecordTypeUnits,
  MeasurementContextLabels,
} from '../../types';
import dayjs from 'dayjs';

type RecordMode = 'single' | 'bloodPressure' | 'bloodSugar' | 'bloodLipid';

const RecordAdd: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [recordMode, setRecordMode] = useState<RecordMode>('single');

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      message.success('记录添加成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
      navigate('/records');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '添加失败');
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: recordsApi.createBatch,
    onSuccess: () => {
      message.success('记录添加成功');
      queryClient.invalidateQueries({ queryKey: ['records'] });
      navigate('/records');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '添加失败');
    },
  });

  const onFinish = (values: Record<string, unknown>) => {
    const recordDate = (values.recordDate as dayjs.Dayjs).toISOString();
    const memberId = values.memberId as string;
    const context = values.context as MeasurementContext | undefined;

    if (recordMode === 'single') {
      // 单条记录
      createMutation.mutate({
        memberId,
        recordDate,
        recordType: values.recordType as RecordType,
        value: values.value as number,
        unit: RecordTypeUnits[values.recordType as RecordType],
        context,
      });
    } else if (recordMode === 'bloodPressure') {
      // 血压记录（收缩压+舒张压+心率）
      const records: RecordItem[] = [];
      if (values.systolicBp) {
        records.push({
          recordType: 'SYSTOLIC_BP',
          value: values.systolicBp as number,
          unit: 'mmHg',
        });
      }
      if (values.diastolicBp) {
        records.push({
          recordType: 'DIASTOLIC_BP',
          value: values.diastolicBp as number,
          unit: 'mmHg',
        });
      }
      if (values.heartRate) {
        records.push({
          recordType: 'HEART_RATE',
          value: values.heartRate as number,
          unit: '次/分',
        });
      }
      if (records.length > 0) {
        createBatchMutation.mutate({
          memberId,
          recordDate,
          context,
          records,
        });
      } else {
        message.error('请至少填写一项血压数据');
      }
    } else if (recordMode === 'bloodSugar') {
      // 血糖记录
      createMutation.mutate({
        memberId,
        recordDate,
        recordType: values.glucoseType as RecordType,
        value: values.glucoseValue as number,
        unit: RecordTypeUnits[values.glucoseType as RecordType],
        context,
      });
    } else if (recordMode === 'bloodLipid') {
      // 血脂记录
      const records: RecordItem[] = [];
      if (values.totalCholesterol) {
        records.push({
          recordType: 'TOTAL_CHOLESTEROL',
          value: values.totalCholesterol as number,
          unit: 'mmol/L',
        });
      }
      if (values.triglycerides) {
        records.push({
          recordType: 'TRIGLYCERIDES',
          value: values.triglycerides as number,
          unit: 'mmol/L',
        });
      }
      if (values.hdl) {
        records.push({
          recordType: 'HDL',
          value: values.hdl as number,
          unit: 'mmol/L',
        });
      }
      if (values.ldl) {
        records.push({
          recordType: 'LDL',
          value: values.ldl as number,
          unit: 'mmol/L',
        });
      }
      if (records.length > 0) {
        createBatchMutation.mutate({
          memberId,
          recordDate,
          context,
          records,
        });
      } else {
        message.error('请至少填写一项血脂数据');
      }
    }
  };

  const renderSingleForm = () => (
    <>
      <Form.Item
        name="recordType"
        label="指标类型"
        rules={[{ required: true, message: '请选择指标类型' }]}
      >
        <Select placeholder="请选择指标类型">
          {(Object.keys(RecordTypeLabels) as RecordType[]).map((key) => (
            <Select.Option key={key} value={key}>
              {RecordTypeLabels[key]} ({RecordTypeUnits[key]})
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        name="value"
        label="数值"
        rules={[{ required: true, message: '请输入数值' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} precision={2} />
      </Form.Item>
    </>
  );

  const renderBloodPressureForm = () => (
    <>
      <Form.Item label="收缩压 (mmHg)" name="systolicBp">
        <InputNumber style={{ width: '100%' }} min={0} max={300} placeholder="90-139 正常" />
      </Form.Item>
      <Form.Item label="舒张压 (mmHg)" name="diastolicBp">
        <InputNumber style={{ width: '100%' }} min={0} max={200} placeholder="60-89 正常" />
      </Form.Item>
      <Form.Item label="心率 (次/分)" name="heartRate">
        <InputNumber style={{ width: '100%' }} min={0} max={300} placeholder="60-100 正常" />
      </Form.Item>
    </>
  );

  const renderBloodSugarForm = () => (
    <>
      <Form.Item
        name="glucoseType"
        label="血糖类型"
        rules={[{ required: true, message: '请选择血糖类型' }]}
      >
        <Select placeholder="请选择血糖类型">
          <Select.Option value="FASTING_GLUCOSE">
            空腹血糖 (3.9-6.1 正常)
          </Select.Option>
          <Select.Option value="POSTPRANDIAL_GLUCOSE">
            餐后血糖 (3.9-7.8 正常)
          </Select.Option>
          <Select.Option value="HBA1C">糖化血红蛋白 (4.0-6.0% 正常)</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        name="glucoseValue"
        label="数值"
        rules={[{ required: true, message: '请输入数值' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} precision={2} />
      </Form.Item>
    </>
  );

  const renderBloodLipidForm = () => (
    <>
      <Form.Item label="总胆固醇 (mmol/L)" name="totalCholesterol">
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          placeholder="2.8-5.2 正常"
        />
      </Form.Item>
      <Form.Item label="甘油三酯 (mmol/L)" name="triglycerides">
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          placeholder="0.56-1.7 正常"
        />
      </Form.Item>
      <Form.Item label="HDL (mmol/L)" name="hdl">
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          placeholder="1.0-1.5 正常"
        />
      </Form.Item>
      <Form.Item label="LDL (mmol/L)" name="ldl">
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          placeholder="0-3.4 正常"
        />
      </Form.Item>
    </>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/records')}>
          返回列表
        </Button>
      </div>

      <h2 style={{ marginBottom: 24 }}>添加健康记录</h2>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            recordDate: dayjs(),
            context: 'OTHER',
          }}
        >
          <Form.Item label="记录类型">
            <Radio.Group
              value={recordMode}
              onChange={(e) => {
                setRecordMode(e.target.value);
                form.resetFields([
                  'recordType',
                  'value',
                  'systolicBp',
                  'diastolicBp',
                  'heartRate',
                  'glucoseType',
                  'glucoseValue',
                  'totalCholesterol',
                  'triglycerides',
                  'hdl',
                  'ldl',
                ]);
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="single">单项指标</Radio.Button>
              <Radio.Button value="bloodPressure">血压监测</Radio.Button>
              <Radio.Button value="bloodSugar">血糖监测</Radio.Button>
              <Radio.Button value="bloodLipid">血脂监测</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider />

          <Form.Item
            name="memberId"
            label="家庭成员"
            rules={[{ required: true, message: '请选择家庭成员' }]}
          >
            <Select placeholder="请选择家庭成员">
              {members?.map((member) => (
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="recordDate"
            label="记录时间"
            rules={[{ required: true, message: '请选择记录时间' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item name="context" label="测量场景">
            <Select>
              {(Object.keys(MeasurementContextLabels) as (keyof typeof MeasurementContextLabels)[]).map(
                (key) => (
                  <Select.Option key={key} value={key}>
                    {MeasurementContextLabels[key]}
                  </Select.Option>
                ),
              )}
            </Select>
          </Form.Item>

          <Divider />

          {recordMode === 'single' && renderSingleForm()}
          {recordMode === 'bloodPressure' && renderBloodPressureForm()}
          {recordMode === 'bloodSugar' && renderBloodSugarForm()}
          {recordMode === 'bloodLipid' && renderBloodLipidForm()}

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || createBatchMutation.isPending}
              >
                提交
              </Button>
              <Button onClick={() => navigate('/records')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default RecordAdd;
