import { Button, Card, Form, Input, message, Upload } from 'antd';
import { Avatar } from 'app/components';
import debounce from 'debounce-promise';
import { BASE_API_URL, BASE_RESOURCE_URL } from 'globalConstants';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components/macro';
import {
  BORDER_RADIUS,
  SPACE_LG,
  SPACE_MD,
  SPACE_UNIT,
} from 'styles/StyleConstants';
import { APIResponse } from 'types';
import { getToken } from 'utils/auth';
import { request } from 'utils/request';
import { useMainSlice } from '../../slice';
import {
  selectCurrentOrganization,
  selectSaveOrganizationLoading,
} from '../../slice/selectors';
import { editOrganization } from '../../slice/thunks';
import { DeleteConfirm } from './DeleteConfirm';

export function OrgSettingPage() {
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const { actions } = useMainSlice();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const dispatch = useDispatch();
  const currentOrganization = useSelector(selectCurrentOrganization);
  const saveOrganizationLoading = useSelector(selectSaveOrganizationLoading);
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentOrganization) {
      form.setFieldsValue(currentOrganization);
    }
  }, [form, currentOrganization]);

  const avatarChange = useCallback(
    ({ file }) => {
      if (file.status === 'done') {
        const response = file.response as APIResponse<string>;
        if (response.success) {
          dispatch(actions.setCurrentOrganizationAvatar(response.data));
        }
        setAvatarLoading(false);
      } else {
        setAvatarLoading(true);
      }
    },
    [dispatch, actions],
  );

  const save = useCallback(
    values => {
      dispatch(
        editOrganization({
          organization: { id: currentOrganization?.id, ...values },
          resolve: () => {
            message.success('修改成功');
          },
        }),
      );
    },
    [dispatch, currentOrganization],
  );

  const showDeleteConfirm = useCallback(() => {
    setDeleteConfirmVisible(true);
  }, []);

  const hideDeleteConfirm = useCallback(() => {
    setDeleteConfirmVisible(false);
  }, []);

  return (
    <Wrapper>
      <Card title="基本信息">
        <Form
          name="source_form_"
          form={form}
          labelAlign="left"
          labelCol={{ offset: 1, span: 7 }}
          wrapperCol={{ span: 16 }}
          onFinish={save}
        >
          <Form.Item label="头像" className="avatar">
            <Avatar
              size={SPACE_UNIT * 20}
              src={`${BASE_RESOURCE_URL}${currentOrganization?.avatar}`}
            >
              {currentOrganization?.name.substr(0, 1).toUpperCase()}
            </Avatar>
          </Form.Item>
          <Form.Item label=" " colon={false}>
            <Upload
              accept=".jpg,.jpeg,.png,.gif"
              method="post"
              action={`${BASE_API_URL}/files/org/avatar?orgId=${currentOrganization?.id}`}
              headers={{ authorization: getToken()! }}
              className="uploader"
              showUploadList={false}
              onChange={avatarChange}
            >
              <Button type="link" loading={avatarLoading}>
                点击上传
              </Button>
            </Upload>
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: '名称不能为空' },
              {
                validator: debounce((_, value) => {
                  if (value === currentOrganization?.name) {
                    return Promise.resolve();
                  }
                  return request({
                    url: `/orgs/check/name`,
                    method: 'POST',
                    params: { name: value },
                  }).then(
                    () => Promise.resolve(),
                    () => Promise.reject(new Error('名称重复')),
                  );
                }, 300),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} />
          </Form.Item>
          <Form.Item label=" " colon={false}>
            <Button
              type="primary"
              htmlType="submit"
              loading={saveOrganizationLoading}
            >
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card title="删除组织">
        <h4 className="notice">
          删除组织时，会将组织内所有资源、成员、角色和其他配置信息一并永久删除，请谨慎操作。
        </h4>
        <Button danger onClick={showDeleteConfirm}>
          删除组织
        </Button>
        <DeleteConfirm
          width={480}
          title="删除组织"
          visible={deleteConfirmVisible}
          onCancel={hideDeleteConfirm}
        />
      </Card>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  flex: 1;
  padding: ${SPACE_LG};
  overflow-y: auto;

  .ant-card {
    margin-top: ${SPACE_LG};
    background-color: ${p => p.theme.componentBackground};
    border-radius: ${BORDER_RADIUS};
    box-shadow: ${p => p.theme.shadow1};

    &:first-of-type {
      margin-top: 0;
    }
  }

  form {
    max-width: 480px;
    padding-top: ${SPACE_MD};
  }

  .avatar {
    align-items: center;
    margin-bottom: 0;
  }

  .notice {
    margin-bottom: ${SPACE_LG};
  }
`;
