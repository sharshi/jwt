"use strict";

var issuingProviders = {
    Unknown: 'unknown',
    AAD: 'aad',
    B2C: 'b2c',
    IEF: 'ief',
    Google: 'google',
    MSA: 'msa'
}
var issuingProviderDescriptions =
{
    'aad': 'This token was issued by <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-token-and-claims">Azure Active Directory</a>.',
    'b2c': 'This token was issued by <a href="https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-reference-tokens">Azure AD B2C</a>.',
    'ief': 'This token was issued using an <a href="https://azure.microsoft.com/en-us/resources/samples/active-directory-b2c-advanced-policies/">custom policy by Identity Experience Framework</a>.',
    'google': 'This token was issued by <a href="https://developers.google.com/identity/protocols/OpenIDConnect">Google</a>.',
    'msa': 'This is a Microsoft Account token.'
};

let issuingProviderDescriptionId;

var Jwt = function (encodedToken) {
    encodedToken = encodedToken.trim();
    this.encodedToken = encodedToken;
    this.decodedHeader = jwt_decode(encodedToken, { header: true });
    this.decodedClaims = jwt_decode(encodedToken.trim());

    var parts = encodedToken.split('.');
    if (parts.length < 2 || parts.length > 3)
        throw new Error('Invalid token, there must be two or three parts.');

    // Public properties
    this.encodedHeader = parts[0];
    this.encodedClaims = parts[1];
    this.encodedSignature = parts[2];
    this.hasSignature = parts.length === 3 && parts[2];
    this.issuingProvider = getIssuingProvider(this.decodedClaims);

    function getIssuingProvider(decodedClaims) {
        var iss = 'iss';
        var tfp = 'tfp';
        var acr = 'acr';
        var b2cPolicyPrefix = 'b2c_1_';
        var iefPolicyPrefix = 'b2c_1a_';

        var issValue = decodedClaims[iss];
        if (!issValue) return '';

        issValue = issValue.toLowerCase();
        var tfpValue = decodedClaims[tfp];
        var acrValue = decodedClaims[acr];

        if ((issValue.indexOf('https://login.microsoftonline.com/') === 0 || issValue.match(/https:\/\/[^./]*\.b2clogin.com\//gi))
            && issValue.indexOf('2.0') > -1) {
            if ((tfpValue && tfpValue.toLowerCase().indexOf(b2cPolicyPrefix) === 0) ||
                (acrValue && acrValue.toLowerCase().indexOf(b2cPolicyPrefix) === 0)) {
                return issuingProviders.B2C;
            } else if ((tfpValue && tfpValue.toLowerCase().indexOf(iefPolicyPrefix) === 0) ||
                (acrValue && acrValue.toLowerCase().indexOf(iefPolicyPrefix) === 0)) {
                return issuingProviders.IEF;
            }
        }

        if ((issValue.indexOf('https://login.chinacloudapi.cn/') === 0 || issValue.match(/https:\/\/[^./]*\.b2clogin.cn\//gi))
            && issValue.indexOf('2.0') > -1) {
            if ((tfpValue && tfpValue.toLowerCase().indexOf(b2cPolicyPrefix) === 0) ||
                (acrValue && acrValue.toLowerCase().indexOf(b2cPolicyPrefix) === 0)) {
                return issuingProviders.B2C;
            } else if ((tfpValue && tfpValue.toLowerCase().indexOf(iefPolicyPrefix) === 0) ||
                (acrValue && acrValue.toLowerCase().indexOf(iefPolicyPrefix) === 0)) {
                return issuingProviders.IEF;
            }
        }

        if (issValue.indexOf('https://login.microsoftonline.com/') === 0 ||
            issValue.indexOf('https://sts.windows.net/') === 0 ||
            issValue.indexOf('https://login.windows.net/') === 0 ||
            issValue.indexOf('https://login.microsoft.com/') === 0 ||
            issValue.indexOf('https://login.microsoft.com/') === 0) {
            return issuingProviders.AAD;
        }

        if (issValue.indexOf('https://login.chinacloudapi.cn/') === 0 ||
            issValue.indexOf('https://sts.chinacloudapi.cn/') === 0) {
            return issuingProviders.AAD;
        }

        if (issValue.indexOf('accounts.google.com') === 0 ||
            issValue.indexOf('https://accounts.google.com') === 0) {
            return issuingProviders.Google;
        }

        return issuingProviders.Unknown;
    }
}

function getUrlFragment(fragmentId) {
    fragmentId = fragmentId + '=';
    if (window.location.hash && window.location.hash.length > 0) {
        var fragmentValueStartIndex = 0;
        var fragmentIdStartIndex = window.location.hash.indexOf(fragmentId);
        if (fragmentIdStartIndex > -1) {
            fragmentValueStartIndex = fragmentIdStartIndex + fragmentId.length;
        }

        if (fragmentValueStartIndex > 0) {
            var fragmentValue = window.location.hash.substring(fragmentValueStartIndex);
            var ampIndex = fragmentValue.indexOf('&');
            if (ampIndex !== -1) {
                fragmentValue = fragmentValue.substring(0, ampIndex);
            }

            return fragmentValue;
        }

        return null;
    }
}

function decodeFragmentValue(fragmentValue) {
    fragmentValue = fragmentValue.replace(/\+/g, '%20');
    fragmentValue = decodeURIComponent(fragmentValue);
    return fragmentValue;
}


function processJwt(jwtText) {
    if (jwtText && jwtText.trim().length > 0) {
        var jwt = new Jwt(jwtText);
        setIssuingDescription(jwt);
        return setDecodedToken(jwt);
        // createClaimsTable(jwt);
    } else {
        setIssuingDescription(null);
        return createClaimsTable(null);
    }
}

function setDecodedToken(jwt) {
    if (jwt == null) {
        return;
    }

    var headerJson = jwt.decodedHeader;
    var claimsJson = jwt.decodedClaims;
    return {
        headerJson,
        claimsJson
    }
}

function setIssuingDescription(jwt) {
    if (jwt == null || !jwt.decodedClaims) {
        issuingProviderDescriptionId = '';
        return;
    }

    var issuingProviderDescription = issuingProviderDescriptions[jwt.issuingProvider];
    if (issuingProviderDescription) {
        issuingProviderDescriptionId = issuingProviderDescription;
    } else {
        issuingProviderDescriptionId = '';
    }
}

function formatEncodedToken(jwt) {
    if (!jwt) return;

    var html = '<span class="jwtHeader">' + jwt.encodedHeader + '</span>.';
    html += '<span class="jwtClaims">' + jwt.encodedClaims + '</span>.';
    if (jwt.hasSignature) html += '<span class="jwtSignature">' + jwt.encodedSignature + '</span>';

    return html;
}

function createClaimsTable(jwt) {
    if (!jwt || !jwt.decodedClaims) {
        return;
    }

    let html = '';
    for (var claimType in jwt.decodedClaims) {
        if (jwt.decodedClaims.hasOwnProperty(claimType)) {
            var formatObject = formatValue(claimType, jwt.decodedClaims[claimType]);
            var description = getDescription(claimType, jwt.issuingProvider);

            html = '<tr>';
            html += '<td><span class="mono prewrapbreakword">' + claimType + '</span></td>';
            html += '<td><span class="formattedvalue ' + formatObject.classes + '"></span></td>';
            html += '<td>' + description + '</td>';
            html += '</tr>';
            // $html.find(".formattedvalue").text(formatObject.formattedValue)
        }
    }
    return html;
}

function formatValue(claimType, value) {
    if ((claimType === 'exp' || claimType === 'nbf' || claimType === 'iat' || claimType === 'auth_time') &&
        typeof value === 'number') {
        var d = new Date(0); // Must provide 0 to set the date to the epoch
        d.setUTCSeconds(value);

        return {
            formattedValue: d,
            classes: 'prewrapbreakword'
        };
    }

    return {
        formattedValue: value,
        classes: 'mono forcebreakword'
    };
}

function getDescription(claimType, issuingProvider) {
    var key = issuingProvider + '_' + claimType;
    var description = claimTypeDescriptions[key];

    if (!description) {
        description = claimTypeDescriptions[claimType];
    }

    if (!description) return '';

    return description;
}

function isGuid(value) {
    var regex = /[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/i;
    var match = regex.exec(value);
    return match != null;
}

var claimTypeDescriptions = { 'aad_ipaddr': 'The IP address the user authenticated from.', 'b2c_streetAddress': 'The street address where the user is located.', 'aad_c_hash': 'The code hash is included in ID tokens only when the ID token is issued with an OAuth 2.0 authorization code. It can be used to validate the authenticity of an authorization code. For details about performing this validation, see the OpenID Connect specification.', 'b2c_country': 'The country in which the user is located.', 'b2c_emails': 'Email addresses of the user. These are mutable and might change over time. Therefore, they are not suitable for identifying the user in other databases or applications. The oid or sub claim should be used instead.', 'aad_azpacr': 'Indicates how the client was authenticated. For a public client, the value is \"0\". If client ID and client secret are used, the value is \"1\". If a client certificate was used for authentication, the value is \"2\".', 'preferred_username': 'Shorthand name by which the End-User wishes to be referred to at the RP, such as janedoe or j.doe. This value MAY be any valid JSON string including special characters such as @, /, or whitespace. The RP MUST NOT rely upon this value being unique, as discussed in <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability\">OpenID Connect Core 1.0 Section 5.7</a>. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'google_email_verified': 'True if the user\'s e-mail address has been verified; otherwise false.', 'aad_nickname': 'An additional name for the user, separate from first or last name.', 'picture': 'URL of the End-User\'s profile picture. This URL MUST refer to an image file (for example, a PNG, JPEG, or GIF image file), rather than to a Web page containing an image. Note that this URL SHOULD specifically reference a profile photo of the End-User suitable for displaying when describing the End-User, rather than an arbitrary photo taken by the End-User. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'b2c_family_name': 'The user\'s surname (also known as last name).', 'aad_onprem_sid': 'In cases where the user has an on-premises authentication, this claim provides their SID. This can be used for authorization in legacy applications.', 'given_name': 'Given name(s) or first name(s) of the End-User. Note that in some cultures, people can have multiple given names; all can be present, with the names being separated by space characters. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'aad_pwd_exp': 'Indicates when the user\'s password expires.', 'aad_pwd_url': 'A URL where users can be sent to reset their password.', 'google_at_hash': 'Access token hash. Provides validation that the access token is tied to the identity token. If the ID token is issued with an access token in the server flow, this is always included. This can be used as an alternate mechanism to protect against cross-site request forgery attacks, but if you follow <a href=\"https://developers.google.com/identity/protocols/OpenIDConnect#createxsrftoken\">Step 1</a> and <a href=\"https://developers.google.com/identity/protocols/OpenIDConnect#confirmxsrftoken\">Step 3</a> it is not necessary to verify the access token.', 'email_verified': 'True if the End-User\'s e-mail address has been verified; otherwise false. When this Claim Value is true, this means that the OP took affirmative steps to ensure that this e-mail address was controlled by the End-User at the time the verification was performed. The means by which an e-mail address is verified is context-specific, and dependent upon the trust framework or contractual agreements within which the parties are operating. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'phone_number': 'End-User\'s preferred telephone number. <a href=\"https://www.itu.int/rec/T-REC-E.164-201011-I/en\">E.164</a> is RECOMMENDED as the format of this Claim, for example, +1 (425) 555-1212 or +56 (2) 687 2400. If the phone number contains an extension, it is RECOMMENDED that the extension be represented using the <a href=\"https://tools.ietf.org/html/rfc3966\">RFC 3966</a>extension syntax, for example, +1 (604) 555-1234;ext=5678. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'google_hd': 'The hosted G Suite domain of the user. Provided only if the user belongs to a hosted domain.', 'updated_at': 'Time the End-User\'s information was last updated. Its value is a JSON number representing the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'b2c_name': 'The user\'s full name in displayable form including all name parts, possibly including titles and suffixes.', 'b2c_city': 'The city in which the user is located.', 'b2c_given_name': 'The user\'s given name (also known as first name).', 'google_picture': 'The URL of the user\'s profile picture. Might be provided when:<ul><li>The request scope included the string \"profile\"</li><li>The ID token is returned from a token refresh</li></ul>When picture claims are present, you can use them to update your app\'s user records. Note that this claim is never guaranteed to be present.', 'b2c_jobTitle': 'The user\'s job title.', 'google_profile': 'The URL of the user\'s profile page. Might be provided when:<ul><li>The request scope included the string \"profile\"</li><li>The ID token is returned from a token refresh</li></ul>When profile claims are present, you can use them to update your app\'s user records. Note that this claim is never guaranteed to be present.', 'aad_preferred_name': 'The primary username that represents the user. It could be an email address, phone number, or a generic username without a specified format. Its value is mutable and might change over time. Since it is mutable, this value must not be used to make authorization decisions. The profile scope is required in order to receive this claim.', 'zoneinfo': 'String from zoneinfo time zone database representing the End-User\'s time zone. For example, Europe/Paris or America/Los_Angeles. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'family_name': 'Surname(s) or last name(s) of the End-User. Note that in some cultures, people can have multiple family names or no family name; all can be present, with the names being separated by space characters. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'aad_appidacr': 'Indicates how the client was authenticated. For a public client, the value is \"0\". If client ID and client secret are used, the value is \"1\". If a client certificate was used for authentication, the value is \"2\".', 'google_email': 'The user\'s email address. This may not be unique and is not suitable for use as a primary key. Provided only if your scope included the string \"email\".', 'aad_preferred_username': 'The primary username that represents the user. It could be an email address, phone number, or a generic username without a specified format. Its value is mutable and might change over time. Since it is mutable, this value must not be used to make authorization decisions. The profile scope is required in order to receive this claim.', 'address': 'End-User\'s preferred postal address. The value of the address member is a JSON lt;a href=\"https://tools.ietf.org/html/rfc4627\">RFC 4627</a> structure containing some or all of the members defined in [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1.1\">OpenID Connect Core 1.0 Section 5.1.1</a>. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'b2c_newUser': 'True if the user is registered during the authentication request that generated the token, false otherwise.', 'email': 'End-User\'s preferred e-mail address. Its value MUST conform to the <a href=\"https://tools.ietf.org/html/rfc5322\">RFC 5322</a> addr-spec syntax. The RP MUST NOT rely upon this value being unique, as discussed in Section 5.7. The RP MUST NOT rely upon this value being unique, as discussed in <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability\">OpenID Connect Core 1.0 Section 5.7</a>. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'nonce': 'String value used to associate a Client session with an ID Token, and to mitigate replay attacks. The value is passed through unmodified from the Authentication Request to the ID Token. If present in the ID Token, Clients MUST verify that the nonce Claim Value is equal to the value of the nonce parameter sent in the Authentication Request. If present in the Authentication Request, Authorization Servers MUST include a nonce Claim in the ID Token with the Claim Value being the nonce value sent in the Authentication Request. Authorization Servers SHOULD perform no other processing on nonce values used. The nonce value is a case sensitive string. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.2\">Section 2</a>]', 'b2c_auth_time': 'This claim is the time at which a user last entered credentials, represented in epoch time.', 'aad_tid': 'A GUID that represents the Azure AD tenant that the user is from. For work and school accounts, the GUID is the immutable tenant ID of the organization that the user belongs to. For personal accounts, the value is 9188040d-6c67-4c5b-b112-36a304b66dad. The profile scope is required in order to receive this claim.', 'aad_ver': 'Indicates the version of the token.', 'aad_scp': 'The set of scopes exposed by your application for which the client application has requested (and received) consent. Your app should verify that these scopes are valid ones exposed by your app, and make authorization decisions based on the value of these scopes. Only included for user tokens.', 'aad_sub': 'The principal about which the token asserts information, such as the user of an app. This value is immutable and cannot be reassigned or reused. The subject is a pairwise identifier - it is unique to a particular application ID. Therefore, if a single user signs into two different apps using two different client IDs, those apps will receive two different values for the subject claim. This may or may not be desired depending on your architecture and privacy requirements.', 'aad_upn': 'The username of the user. May be a phone number, email address, or unformatted string. Should only be used for display purposes and providing username hints in reauthentication scenarios.', 'aad_uti': 'An internal claim used by Azure to revalidate tokens. Should be ignored.', 'aad_oid': 'The immutable identifier for an object in the Microsoft identity system, in this case, a user account. This ID uniquely identifies the user across applications - two different applications signing in the same user will receive the same value in the oid claim. The Microsoft Graph will return this ID as the id property for a given user account. Because the oid allows multiple apps to correlate users, the profile scope is required in order to receive this claim. Note that if a single user exists in multiple tenants, the user will contain a different object ID in each tenant - they are considered different accounts, even though the user logs into each account with the same credentials.', 'aad_nbf': 'The \"nbf\" (not before) claim identifies the time before which the JWT MUST NOT be accepted for processing.', 'aad_iss': 'Identifies the security token service (STS) that constructs and returns the token, and the Azure AD tenant in which the user was authenticated. If the token was issued by the v2.0 endpoint, the URI will end in /v2.0. The GUID that indicates that the user is a consumer user from a Microsoft account is 9188040d-6c67-4c5b-b112-36a304b66dad. Your app should use the GUID portion of the claim to restrict the set of tenants that can sign in to the app, if applicable.', 'aad_idp': 'Records the identity provider that authenticated the subject of the token. This value is identical to the value of the Issuer claim unless the user account not in the same tenant as the issuer - guests, for instance. If the claim is not present, it means that the value of iss can be used instead. For personal accounts being used in an orgnizational context (for instance, a personal account invited to an Azure AD tenant), the idp claim may be \'live.com\' or an STS URI containing the Microsoft account tenant 9188040d-6c67-4c5b-b112-36a304b66dad.', 'aad_iat': '\"Issued At\" indicates when the authentication for this token occurred.', 'aad_exp': 'The \"exp\" (expiration time) claim identifies the expiration time on or after which the JWT MUST NOT be accepted for processing. It\'s important to note that a resource may reject the token before this time as well - if for example a change in authentication is required or a token revocation has been detected.', 'aad_azp': 'The application ID of the client using the token. The application can act as itself or on behalf of a user. The application ID typically represents an application object, but it can also represent a service principal object in Azure AD.', 'aad_aud': 'Identifies the intended recipient of the token. In id_tokens, the audience is your app\'s Application ID, assigned to your app in the Azure portal. Your app should validate this value, and reject the token if the value does not match.', 'aad_amr': 'Identifies how the subject of the token was authenticated. Microsoft identities can authenticate in a variety of ways, which may be relevant to your application. The amr claim is an array that can contain multiple items, such as [\"mfa\", \"rsa\", \"pwd\"], for an authentication that used both a password and the Authenticator app. See the <a href=\"https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens#the-amr-claim\">amr claim section</a> in <a href=\"https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens\">Azure Active Directory access tokens</a> documentation for values.', 'aad_aio': 'An internal claim used by Azure AD to record data for token reuse. Should be ignored.', 'aad_acr': 'The \"Authentication context class\" claim. A value of \"0\" indicates the end-user authentication did not meet the requirements of ISO/IEC 29115.', 'exp': 'The \"exp\" (expiration time) claim identifies the expiration time on or after which the JWT MUST NOT be accepted for processing. Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew. [<a href=\"https://tools.ietf.org/html/rfc7519\">RFC 7519</a>, <a href=\"https://tools.ietf.org/html/rfc7519#section-4.1.4\">Section 4.1.4</a>]', 'amr': 'Authentication Methods References.  JSON array of strings that are identifiers for authentication methods used in the authentication.  For instance, values might indicate that both password and OTP authentication methods were used.  The definition of particular values to be used in the \"amr\" Claim is beyond the scope of this specification.  Parties using this claim will need to agree upon the meanings of the values used, which may be context-specific.  The \"amr\" value is an array of case sensitive strings. [<a href=\"https://tools.ietf.org/html/rfc8176\">RFC 8176</a>, <a href=\"https://tools.ietf.org/html/rfc8176#section-1\">Section 1</a>, reference values: <a href=\"https://tools.ietf.org/html/rfc8176#section-2\">Section 2</a>]', 'acr': 'Authentication Context Class Reference. String specifying an Authentication Context Class Reference value that identifies the Authentication Context Class that the authentication performed satisfied. The value \"0\" indicates the End-User authentication did not meet the requirements of ISO/IEC 29115 [ISO29115] level 1. Authentication using a long-lived browser cookie, for instance, is one example where the use of \"level 0\" is appropriate. Authentications with level 0 SHOULD NOT be used to authorize access to any resource of any monetary value. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.2\">Section 2</a>]', 'aud': 'The \"aud\" (audience) claim identifies the recipients that the JWT is intended for. Each principal intended to process the JWT MUST identify itself with a value in the audience claim. If the principal processing the claim does not identify itself with a value in the \"aud\" claim when this claim is present, then the JWT MUST be rejected.  [<a href=\"https://tools.ietf.org/html/rfc7519\">RFC 7519</a>, <a href=\"https://tools.ietf.org/html/rfc7519#section-4.1.3\">Section 4.1.3</a>]', 'azp': ' Authorized party - the party to which the ID Token was issued. If present, it MUST contain the OAuth 2.0 Client ID of this party. This Claim is only needed when the ID Token has a single audience value and that audience is different than the authorized party. It MAY be included even when the authorized party is the same as the sole audience. The azp value is a case sensitive string containing a StringOrURI value. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.2\">Section 2</a>]', 'iat': 'The \"iat\" (issued at) claim identifies the time at which the JWT was issued. This claim can be used to determine the age of the JWT. [<a href=\"https://tools.ietf.org/html/rfc7519\">RFC 7519</a>, <a href=\"https://tools.ietf.org/html/rfc7519#section-4.1.6\">Section 4.1.6</a>]', 'iss': 'The \"iss\" (issuer) claim identifies the principal that issued the JWT. The processing of this claim is generally application specific. The \"iss\" value is a case-sensitive string containing a StringOrURI value. [<a href=\"https://tools.ietf.org/html/rfc7519\">RFC 7519</a>, <a href=\"https://tools.ietf.org/html/rfc7519#section-4.1.1\">Section 4.1.1</a>]', 'nbf': 'The \"nbf\" (not before) claim identifies the time before which the JWT MUST NOT be accepted for processing. Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew. [<a href=\"https://tools.ietf.org/html/rfc7519\">RFC 7519</a>, <a href=\"https://tools.ietf.org/html/rfc7519#section-4.1.5\">Section 4.1.5</a>]', 'jti': 'The \"jti\" (JWT ID) claim provides a unique identifier for the JWT. The identifier value MUST be assigned in a manner that ensures that there is a negligible probability that the same value will be accidentally assigned to a different data object; if the application uses multiple issuers, collisions MUST be prevented among values produced by different issuers as well.  The \"jti\" claim can be used to prevent the JWT from being replayed.  The \"jti\" value is a case-sensitive string. [<a href=\"https://tools.ietf.org/html/rfc7519\">RFC 7519</a>, <a href=\"https://tools.ietf.org/html/rfc7519#section-4.1.7\">Section 4.1.7</a>]', 'sub': 'The \"sub\" (subject) claim identifies the principal that is the subject of the JWT. The claims in a JWT are normally statements about the subject. The subject value MUST either be scoped to be locally unique in the context of the issuer or be globally unique. The processing of this claim is generally application specific. The \"sub\" value is a case-sensitive string containing a StringOrURI value. [<a href=\"https://tools.ietf.org/html/rfc7519\">RFC 7519</a>, <a href=\"https://tools.ietf.org/html/rfc7519#section-4.1.2\">Section 4.1.2</a>]', 'aad_family_name': 'Provides the last name, surname, or family name of the user as defined on the user object.', 'auth_time': 'Time when the End-User authentication occurred. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.2\">Section 2</a>]', 'aad_in_corp': 'Signals if the client is logging in from the corporate network. If they are not, the claim is not included.', 'b2c_idp': 'The identity provider used by the user to authenticate.', 'b2c_iat': 'The time at which the token was issued, represented in epoch time.', 'b2c_iss': 'This claim identifies the security token service (STS) that constructs and returns the token. It also identifies the Azure AD directory in which the user was authenticated. Your app should validate the issuer claim to ensure that the token came from the v2.0 endpoint. It also should use the GUID portion of the claim to restrict the set of tenants that can sign in to the app.', 'b2c_nbf': 'This claim is the time at which the token becomes valid, represented in epoch time. This is usually the same as the time the token was issued. Your app should use this claim to verify the validity of the token lifetime.', 'b2c_oid': 'The immutable identifier for the user account in the tenant. It can be used to perform authorization checks safely and as a key in database tables. This ID uniquely identifies the user across applications - two different applications signing in the same user will receive the same value in the oid claim. This means that it can be used when making queries to Microsoft online services, such as the Microsoft Graph. The Microsoft Graph will return this ID as the id property for a given user account.', 'b2c_acr': 'Not used currently, except in the case of older policies. To learn more, see <a href=\"https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-token-session-sso\">Azure Active Directory B2C: Token, session, and single sign-on configuration</a>.', 'b2c_aud': 'An audience claim identifies the intended recipient of the token. For Azure AD B2C, the audience is your app\'s Application ID, as assigned to your app in the app registration portal. Your app should validate this value and reject the token if it does not match.', 'b2c_exp': 'The expiration time claim is the time at which the token becomes invalid, represented in epoch time. Your app should use this claim to verify the validity of the token lifetime.', 'b2c_sub': 'This is the principal about which the token asserts information, such as the user of an app. This value is immutable and cannot be reassigned or reused. It can be used to perform authorization checks safely, such as when the token is used to access a resource. By default, the subject claim is populated with the object ID of the user in the directory. To learn more, see <a href=\"https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-token-session-sso\">Azure Active Directory B2C: Token, session, and single sign-on configuration</a>.', 'b2c_ver': 'The version of the ID token, as defined by Azure AD B2C.', 'b2c_tfp': 'This is the name of the policy that was used to acquire the token.', 'b2c_nonce': 'A nonce is a strategy used to mitigate token replay attacks. Your app can specify a nonce in an authorization request by using the nonce query parameter. The value you provide in the request will be emitted unmodified in the nonce claim of an ID token only. This allows your app to verify the value against the value it specified on the request, which associates the app\'s session with a given ID token. Your app should perform this validation during the ID token validation process.', 'b2c_state': 'The state or province in which the user is located.', 'at_hash': 'Access Token hash value. Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the access_token value, where the hash algorithm used is the hash algorithm used in the alg Header Parameter of the ID Token\'s JOSE Header. For instance, if the alg is RS256, hash the access_token value with SHA-256, then take the left-most 128 bits and base64url encode them. The at_hash value is a case sensitive string. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.3.1.3.6\">Section 3.1.3.6</a>]', 'aad_unique_name': 'Provides a human readable value that identifies the subject of the token. This value is not guaranteed to be unique within a tenant and should be used only for display purposes. Only issued in v1.0 id_tokens.', 'aad_hasgroups': 'If present, always true, denoting the user is in at least one group. Used in place of the groups claim for JWTs in implicit grant flows if the full groups claim would extend the URI fragment beyond the URL length limits (currently 6 or more groups). Indicates that the client should use the Graph to determine the user\'s groups (https://graph.windows.net/{tenantID}/users/{userID}/getMemberObjects).', 'middle_name': 'Middle name(s) of the End-User. Note that in some cultures, people can have multiple middle names; all can be present, with the names being separated by space characters. Also note that in some cultures, middle names are not used. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'aad_at_hash': 'The access token hash is included in ID tokens only when the ID token is issued with an OAuth 2.0 access token. It can be used to validate the authenticity of an access token. For details about performing this validation, see the OpenID Connect specification.', 'aad_roles': 'The set of permissions exposed by your application that the requesting application has been given permission to call. This is used during the client-credentials flow in place of user scopes, and is only present in applications tokens.', 'aad_nonce': 'The nonce matches the parameter included in the original /authorize request to the IDP. If it does not match, your application should reject the token.', 'aad_email': 'The email claim is present by default for guest accounts that have an email address. Your app can request the email claim for managed users (those from the same tenant as the resource) using the email optional claim. On the v2.0 endpoint, your app can also request the email OpenID Connect scope - you don\'t need to request both the optional claim and the scope to get the claim. The email claim only supports addressable mail from the user\'s profile information.', 'aad_appid': 'The application ID of the client using the token. The application can act as itself or on behalf of a user. The application ID typically represents an application object, but it can also represent a service principal object in Azure AD.', 'b2c_at_hash': 'An access token hash is included in an ID token only when the token is issued together with an OAuth 2.0 access token. An access token hash can be used to validate the authenticity of an access token. For more details on how to perform this validation, see the <a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect specification</a> .', 'aad_rh': 'An internal claim used by Azure to revalidate tokens. Should be ignored.', 'aad_given_name': 'Provides the first or given name of the user, as set on the user object.', 'aad_groups_src1': 'For token requests that are not length limited (see hasgroups above) but still too large for the token, a link to the full groups list for the user will be included. For JWTs as a distributed claim, for SAML as a new claim in place of the groups claim.', 'phone_number_verified': 'True if the End-User\'s phone number has been verified; otherwise false. When this Claim Value is true, this means that the OP took affirmative steps to ensure that this phone number was controlled by the End-User at the time the verification was performed. The means by which a phone number is verified is context-specific, and dependent upon the trust framework or contractual agreements within which the parties are operating. When true, the phone_number Claim MUST be in <a href=\"https://www.itu.int/rec/T-REC-E.164-201011-I/en\">E.164</a> format and any extensions MUST be represented in <a href=\"https://tools.ietf.org/html/rfc3966\">RFC 3966</a> format. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'gender': 'End-User\'s gender. Values defined by this specification are female and male. Other values MAY be used when neither of the defined values are applicable. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'locale': 'End-User\'s locale, represented as a BCP47 [<a href=\"https://tools.ietf.org/html/rfc5646\">RFC5646</a>] language tag. This is typically an ISO 639-1 Alpha-2 language code in lowercase and an ISO 3166-1 Alpha-2 country code in uppercase, separated by a dash. For example, en-US or fr-CA. As a compatibility note, some implementations have used an underscore as the separator rather than a dash, for example, en_US; Relying Parties MAY choose to accept this locale syntax as well. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'google_name': 'The user\'s full name, in a displayable form. Might be provided when:<ul><li>The request scope included the string \"profile\"</li><li>The ID token is returned from a token refresh</li></ul>When name claims are present, you can use them to update your app\'s user records. Note that this claim is never guaranteed to be present.', 'c_hash': 'Code hash value. Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the code value, where the hash algorithm used is the hash algorithm used in the alg Header Parameter of the ID Token\'s JOSE Header. For instance, if the alg is HS512, hash the code value with SHA-512, then take the left-most 256 bits and base64url encode them. The c_hash value is a case sensitive string. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.3.3.2.11\">Section 3.3.2.11</a>]', 'nickname': 'Casual name of the End-User that may or may not be the same as the given_name. For instance, a nickname value of Mike might be returned alongside a given_name value of Michael. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'b2c_postalCode': 'The postal code of the user\'s address.', 'profile': 'URL of the End-User\'s profile page. The contents of this Web page SHOULD be about the End-User. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'aad_name': 'The name claim provides a human-readable value that identifies the subject of the token. The value is not guaranteed to be unique, it is mutable, and it\'s designed to be used only for display purposes. The profile scope is required in order to receive this claim.', 'birthdate': 'End-User\'s birthday, represented as an ISO 8601:2004 YYYY-MM-DD format. The year MAY be 0000, indicating that it is omitted. To represent only the year, YYYY format is allowed. Note that depending on the underlying platform\'s date related function, providing just year can result in varying month and day, so the implementers need to take this factor into account to correctly process the dates. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'website': 'URL of the End-User\'s Web page or blog. This Web page SHOULD contain information published by the End-User or an organization that the End-User is affiliated with. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'b2c_c_hash': 'A code hash is included in an ID token only when the token is issued together with an OAuth 2.0 authorization code. A code hash can be used to validate the authenticity of an authorization code. For more details on how to perform this validation, see the <a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect specification</a>.', 'name': 'End-User\'s full name in displayable form including all name parts, possibly including titles and suffixes, ordered according to the End-User\'s locale and preferences. [<a href=\"https://openid.net/specs/openid-connect-core-1_0.html\">OpenID Connect Core 1.0</a>, <a href=\"https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.5.1\">Section 5.1</a>]', 'google_sub': 'An identifier for the user, unique among all Google accounts and never reused. A Google account can have multiple emails at different points in time, but the sub value is never changed. Use sub within your application as the unique-identifier key for the user.', 'google_azp': 'The client_id of the authorized presenter. This claim is only needed when the party requesting the ID token is not the same as the audience of the ID token. This may be the case at Google for hybrid apps where a web application and Android app have a different client_id but share the same project.', 'google_aud': 'Identifies the audience that this ID token is intended for. It must be one of the OAuth 2.0 client IDs of your application.', 'google_iss': 'The Issuer Identifier for the Issuer of the response. Always https://accounts.google.com or accounts.google.com for Google ID tokens.', 'aad_groups': 'Provides object IDs that represent the subject\'s group memberships. These values are unique (see Object ID) and can be safely used for managing access, such as enforcing authorization to access a resource. The groups included in the groups claim are configured on a per-application basis, through the groupMembershipClaims property of the application manifest. A value of null will exclude all groups, a value of \"SecurityGroup\" will include only Active Directory Security Group memberships, and a value of \"All\" will include both Security Groups and Office 365 Distribution Lists.<br/>See the hasgroups claim below for details on using the groups claim with the implicit grant.<br/>For other flows, if the number of groups the user is in goes over a limit (150 for SAML, 200 for JWT), then an overage claim will be added to the claim sources pointing at the Graph endpoint containing the list of groups for the user.' };