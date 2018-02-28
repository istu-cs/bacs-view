import AuthApi from '../api/authApi';
import { AuthState, SessionInfo, UserRole } from '../typings';

function parseJwt(token): SessionInfo {
  if (!token)
    return null;
  token = token.split(' ')[1];
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(window.atob(base64));
}


const findParam = (paramName: string) => (
  document.cookie
    .split(';')
    .map(str => str.trimLeft())
    .find(value => value.startsWith(paramName))
  || '');

const getFromCookies = (paramName: string) => {
  return findParam(paramName)
    .substring(1 + paramName.length);
}

const clearCookieParam = (paramName: string) => {
  document.cookie = paramName + '=';
}

const authCookieJWT = 'AuthBacsToken';
const authHeaderName = 'authorization';

export default class AuthService {
  static SignUp(login: string, password: string) {
    return AuthApi.SignUp(login, password);
  }

  static Auth(login: string, password: string): Promise<AuthState> {
    return AuthApi.Auth(login, password)
      .then(response => {
        const token = response.headers[authHeaderName];
        AuthApi.SetJWT(authHeaderName, token);
        document.cookie = authCookieJWT + '=' + token;
        return AuthState.Success;
      })
      .catch(() => Promise.resolve(AuthState.Fail));
  }

  static GetSessionInfo(): SessionInfo {
    const token = getFromCookies(authCookieJWT);
    return parseJwt(token);
  }

  static CheckAuth(): AuthState {
    try {
      const token = getFromCookies(authCookieJWT);
      const info = parseJwt(token);
      const expiresIn = info && info.exp
        ? new Date(info.exp * 1000)
        : null;

      const now = new Date();
      if (expiresIn && now < expiresIn) {
        AuthApi.SetJWT(authHeaderName, token);
        return AuthState.Success;
      }
    }
    catch (e) {
      console.log(e);
    }
    return AuthState.None;
  }

  static Logout() {
    clearCookieParam(authCookieJWT);
  }

  static IsAdmin(sessionInfo?: SessionInfo): boolean {
    return (
      sessionInfo || this.GetSessionInfo()
    ).roles.includes(UserRole.Admin);
  }
}
