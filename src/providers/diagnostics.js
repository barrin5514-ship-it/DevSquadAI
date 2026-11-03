// Static classifications only: untrusted remote error messages never enter logs or responses.
export function classifyProviderFailure(status,data){
 const code=data?.error?.code;
 if(status===403&&data?.error?.message==='Access denied. Please check your network settings.')return 'network_access_denied';
 if(status===403&&['model_permission_blocked_org','model_permission_blocked_project'].includes(code))return code;
 if(status===402)return 'payment_required';
 if(status===404&&typeof data?.detail==='string'&&/^Function\b.*\bnot found for account\b/i.test(data.detail))return 'hosted_function_unavailable_for_account';
 if(status===503)return 'service_unavailable';
 if(status===401)return 'authentication_failed';if(status===429)return 'rate_limited';if(status===404)return 'not_found';return 'provider_access_error';
}
