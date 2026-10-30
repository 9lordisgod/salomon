//! JNI for `ai.salomon.core.SalomonCore.nativeAsk`.
//! Build Android `.so` with: `cargo ndk … --features jni` (or default features once enabled).

#[cfg(feature = "jni")]
mod imp {
    use crate::{ask, AskStatus};
    use jni::objects::{JClass, JObject, JObjectArray, JString, JValue};
    use jni::sys::jobjectArray;
    use jni::JNIEnv;

    fn status_code(s: AskStatus) -> &'static str {
        match s {
            AskStatus::MissingModel => "0",
            AskStatus::Stub => "1",
            AskStatus::Local => "2",
            AskStatus::Refused => "3",
        }
    }

    /// `Java_ai_salomon_core_SalomonCore_nativeAsk` → `[statusCode, text, error]`
    #[no_mangle]
    pub extern "system" fn Java_ai_salomon_core_SalomonCore_nativeAsk<'local>(
        mut env: JNIEnv<'local>,
        _class: JClass<'local>,
        prompt: JString<'local>,
    ) -> jobjectArray {
        let prompt_owned: String = match env.get_string(&prompt) {
            Ok(s) => s.into(),
            Err(_) => String::new(),
        };
        let result = if prompt_owned.is_empty() && env.exception_check().unwrap_or(false) {
            // get_string failed
            crate::AskResult {
                status: AskStatus::Refused,
                text: String::new(),
                error: Some("invalid_prompt".into()),
            }
        } else {
            ask(&prompt_owned)
        };

        let array = match env.new_object_array(3, "java/lang/String", JObject::null()) {
            Ok(a) => a,
            Err(_) => return std::ptr::null_mut(),
        };

        let set = |env: &mut JNIEnv, arr: &JObjectArray, idx: i32, val: Option<&str>| {
            let obj = match val {
                Some(v) => match env.new_string(v) {
                    Ok(s) => JObject::from(s),
                    Err(_) => JObject::null(),
                },
                None => JObject::null(),
            };
            let _ = env.set_object_array_element(arr, idx, obj);
        };

        set(&mut env, &array, 0, Some(status_code(result.status)));
        set(&mut env, &array, 1, Some(&result.text));
        set(
            &mut env,
            &array,
            2,
            result.error.as_deref(),
        );

        array.into_raw()
    }

    // silence unused import warnings on older jni
    #[allow(dead_code)]
    fn _keep(v: JValue) {
        let _ = v;
    }
}

#[cfg(feature = "jni")]
pub use imp::*;
