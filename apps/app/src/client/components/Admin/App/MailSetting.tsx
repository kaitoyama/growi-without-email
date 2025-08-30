import React from 'react';

import { useTranslation } from 'next-i18next';

import AdminAppContainer from '~/client/services/AdminAppContainer';
import { toastSuccess, toastError } from '~/client/util/toastr';

import { withUnstatedContainers } from '../../UnstatedUtils';

import SesSetting from './SesSetting';
import SmtpSetting from './SmtpSetting';


type Props = {
  adminAppContainer: AdminAppContainer,
}


const MailSetting = (props: Props) => {
  const { t } = useTranslation(['admin', 'commons']);
  const { adminAppContainer } = props;

  const transmissionMethods = ['smtp', 'ses'];

  async function submitHandler() {
    try {
      await adminAppContainer.updateMailSettingHandler();
      toastSuccess(t('toaster.update_successed', { target: t('admin:app_setting.mail_settings'), ns: 'commons' }));
    }
    catch (err) {
      toastError(err);
    }
  }

  async function sendTestEmailHandler() {
    const { adminAppContainer } = props;
    try {
      await adminAppContainer.sendTestEmail();
      toastSuccess(t('admin:app_setting.success_to_send_test_email'));
    }
    catch (err) {
      toastError(err);
    }
  }


  return (
    <React.Fragment>
      <div className="alert alert-info d-flex align-items-center">
        <span className="material-symbols-outlined me-2">info</span>
        <span>メール関連機能はこのインスタンスでは無効化されています。</span>
      </div>
    </React.Fragment>
  );

};

/**
 * Wrapper component for using unstated
 */
const MailSettingWrapper = withUnstatedContainers(MailSetting, [AdminAppContainer]);

export default MailSettingWrapper;
