import React from 'react';

import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import PropTypes from 'prop-types';

import AdminGeneralSecurityContainer from '~/client/services/AdminGeneralSecurityContainer';
import AdminLocalSecurityContainer from '~/client/services/AdminLocalSecurityContainer';
import { toastSuccess, toastError } from '~/client/util/toastr';
import { useIsMailerSetup } from '~/stores-universal/context';

import { withUnstatedContainers } from '../../UnstatedUtils';

class LocalSecuritySettingContents extends React.Component {

  constructor(props) {
    super(props);

    this.onClickSubmit = this.onClickSubmit.bind(this);
  }

  async onClickSubmit() {
    const { t, adminGeneralSecurityContainer, adminLocalSecurityContainer } = this.props;
    try {
      await adminLocalSecurityContainer.updateLocalSecuritySetting();
      await adminGeneralSecurityContainer.retrieveSetupStratedies();
      toastSuccess(t('security_settings.updated_general_security_setting'));
    }
    catch (err) {
      toastError(err);
    }
  }

  render() {
    const {
      t,
      adminGeneralSecurityContainer,
      adminLocalSecurityContainer,
      isMailerSetup,
    } = this.props;
    const { registrationMode, isPasswordResetEnabled, isEmailAuthenticationEnabled } = adminLocalSecurityContainer.state;
    const { isLocalEnabled } = adminGeneralSecurityContainer.state;

    return (
      <>
        {adminLocalSecurityContainer.state.retrieveError != null && (
          <div className="alert alert-danger">
            <p>
              {t('Error occurred')} : {adminLocalSecurityContainer.state.retrieveError}
            </p>
          </div>
        )}
        <h2 className="alert-anchor border-bottom">{t('security_settings.Local.name')}</h2>

        {adminLocalSecurityContainer.state.useOnlyEnvVars && (
          <p
            className="alert alert-info"
            // eslint-disable-next-line max-len
            dangerouslySetInnerHTML={{
              __html: t('security_settings.Local.note for the only env option', { env: 'LOCAL_STRATEGY_USES_ONLY_ENV_VARS_FOR_SOME_OPTIONS' }),
            }}
          />
        )}

        <div className="row mt-4 mb-5">
          <div className="col-6 offset-3">
            <div className="form-check form-switch form-check-success">
              <input
                type="checkbox"
                className="form-check-input"
                id="isLocalEnabled"
                checked={isLocalEnabled}
                onChange={() => adminGeneralSecurityContainer.switchIsLocalEnabled()}
                disabled={adminLocalSecurityContainer.state.useOnlyEnvVars}
              />
              <label className="form-label form-check-label" htmlFor="isLocalEnabled">
                {t('security_settings.Local.enable_local')}
              </label>
            </div>
            {!adminGeneralSecurityContainer.state.setupStrategies.includes('local') && isLocalEnabled && (
              <div className="badge bg-warning text-dark">{t('security_settings.setup_is_not_yet_complete')}</div>
            )}
          </div>
        </div>

        {isLocalEnabled && (
          <>
            <h3 className="border-bottom">{t('security_settings.configuration')}</h3>

            <div className="row">
              <div className="col-12 col-md-4 text-start text-md-end py-2">
                <strong>{t('security_settings.register_limitation')}</strong>
              </div>
              <div className="col-12 col-md-8">
                <div className="dropdown">
                  <button
                    className="btn btn-outline-secondary dropdown-toggle"
                    type="button"
                    id="dropdownMenuButton"
                    data-bs-toggle="dropdown"
                    aria-haspopup="true"
                    aria-expanded="true"
                  >
                    {registrationMode === 'Open' && t('security_settings.registration_mode.open')}
                    {registrationMode === 'Restricted' && t('security_settings.registration_mode.restricted')}
                    {registrationMode === 'Closed' && t('security_settings.registration_mode.closed')}
                  </button>
                  <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                    <button
                      className="dropdown-item"
                      type="button"
                      onClick={() => {
                        adminLocalSecurityContainer.changeRegistrationMode('Open');
                      }}
                    >
                      {t('security_settings.registration_mode.open')}
                    </button>
                    <button
                      className="dropdown-item"
                      type="button"
                      onClick={() => {
                        adminLocalSecurityContainer.changeRegistrationMode('Restricted');
                      }}
                    >
                      {t('security_settings.registration_mode.restricted')}
                    </button>
                    <button
                      className="dropdown-item"
                      type="button"
                      onClick={() => {
                        adminLocalSecurityContainer.changeRegistrationMode('Closed');
                      }}
                    >
                      {t('security_settings.registration_mode.closed')}
                    </button>
                  </div>
                </div>
                <p className="form-text text-muted small">{t('security_settings.register_limitation_desc')}</p>
              </div>
            </div>
            {/* メールドメインの登録制限(Whitelist)は廃止 */}

            {/* パスワードリセット設定は無効化 */}

            {/* メール認証設定は無効化 */}

            <div className="row my-3">
              <div className="offset-3 col-6">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={adminLocalSecurityContainer.state.retrieveError != null}
                  onClick={this.onClickSubmit}
                >
                  {t('Update')}
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

}

LocalSecuritySettingContents.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  adminGeneralSecurityContainer: PropTypes.instanceOf(AdminGeneralSecurityContainer).isRequired,
  adminLocalSecurityContainer: PropTypes.instanceOf(AdminLocalSecurityContainer).isRequired,
};

const LocalSecuritySettingContentsWrapperFC = (props) => {
  const { t } = useTranslation('admin');
  const { data: isMailerSetup } = useIsMailerSetup();
  return <LocalSecuritySettingContents t={t} {...props} isMailerSetup={isMailerSetup ?? false} />;
};

const LocalSecuritySettingContentsWrapper = withUnstatedContainers(LocalSecuritySettingContentsWrapperFC, [
  AdminGeneralSecurityContainer,
  AdminLocalSecurityContainer,
]);

export default LocalSecuritySettingContentsWrapper;
