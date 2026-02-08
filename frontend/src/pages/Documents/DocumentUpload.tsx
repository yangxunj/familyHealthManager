import { useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Upload,
  message,
  Space,
  Grid,
} from 'antd';
import { InboxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, storageApi, membersApi } from '../../api';
import type { DocumentType, FileInfo } from '../../types';
import { DocumentTypeLabels } from '../../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Dragger } = Upload;
const { useBreakpoint } = Grid;

const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: documentsApi.create,
    onSuccess: () => {
      message.success('文档上传成功');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['memberStats'] });
      navigate('/documents');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      message.error(err.response?.data?.error?.message || '上传失败');
    },
  });

  const handleUpload = async (file: File): Promise<FileInfo | null> => {
    try {
      const result = await storageApi.uploadFile(file);
      return result;
    } catch {
      message.error(`文件 ${file.name} 上传失败`);
      return null;
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: async (file) => {
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        message.error('只支持 JPG、PNG、GIF 和 PDF 格式的文件');
        return Upload.LIST_IGNORE;
      }

      // 验证文件大小
      if (file.size > 10 * 1024 * 1024) {
        message.error('文件大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }

      setUploading(true);
      const result = await handleUpload(file);
      setUploading(false);

      if (result) {
        setUploadedFiles((prev) => [...prev, result]);
        setFileList((prev) => [
          ...prev,
          {
            uid: result.name,
            name: result.originalName,
            status: 'done',
            url: result.url,
          },
        ]);
      }

      return false;
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
      setUploadedFiles((prev) => prev.filter((f) => f.name !== file.uid));
    },
  };

  const onFinish = (values: Record<string, unknown>) => {
    if (uploadedFiles.length === 0) {
      message.error('请至少上传一个文件');
      return;
    }

    createMutation.mutate({
      memberId: values.memberId as string,
      type: values.type as DocumentType,
      name: values.name as string,
      checkDate: (values.checkDate as dayjs.Dayjs).format('YYYY-MM-DD'),
      institution: values.institution as string | undefined,
      files: uploadedFiles,
      notes: values.notes as string | undefined,
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
          返回列表
        </Button>
      </div>

      <h2 style={{ marginBottom: 24 }}>上传健康文档</h2>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
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
            name="type"
            label="文档类型"
            rules={[{ required: true, message: '请选择文档类型' }]}
          >
            <Select placeholder="请选择文档类型">
              {(Object.keys(DocumentTypeLabels) as DocumentType[]).map((key) => (
                <Select.Option key={key} value={key}>
                  {DocumentTypeLabels[key]}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="文档名称"
            rules={[{ required: true, message: '请输入文档名称' }]}
          >
            <Input placeholder="例如：2024年度体检报告" />
          </Form.Item>

          <Form.Item
            name="checkDate"
            label="检查日期"
            rules={[{ required: true, message: '请选择检查日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              inputReadOnly={isMobile}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item name="institution" label="检查机构">
            <Input placeholder="例如：XX医院体检中心" />
          </Form.Item>

          <Form.Item
            label="上传文件"
            required
            extra="支持 JPG、PNG、GIF、PDF 格式，单个文件不超过 10MB"
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持单个或批量上传</p>
            </Dragger>
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || uploading}
                disabled={uploadedFiles.length === 0}
              >
                提交
              </Button>
              <Button onClick={() => navigate('/documents')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default DocumentUpload;
