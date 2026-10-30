/* Tiny JNI shim over salomon-core C ABI (M-A0).
 * salomon_ask(prompt) -> JSON char*; free with salomon_free_string.
 * Java_* symbols live here — not necessarily inside libsalomon_core.so.
 */
#include <jni.h>
#include <stdlib.h>
#include <string.h>

extern char *salomon_ask(const char *prompt);
extern void salomon_free_string(char *ptr);
extern const char *salomon_version(void);

JNIEXPORT jstring JNICALL
Java_ai_salomon_core_SalomonCore_nativeAskJson(JNIEnv *env, jclass clazz, jstring prompt) {
    (void)clazz;
    if (prompt == NULL) {
        return (*env)->NewStringUTF(env, "{\"status\":\"Refused\",\"text\":\"\",\"error\":\"null_prompt\"}");
    }
    const char *cprompt = (*env)->GetStringUTFChars(env, prompt, NULL);
    if (cprompt == NULL) {
        return (*env)->NewStringUTF(env, "{\"status\":\"Refused\",\"text\":\"\",\"error\":\"invalid_prompt\"}");
    }
    char *json = salomon_ask(cprompt);
    (*env)->ReleaseStringUTFChars(env, prompt, cprompt);
    if (json == NULL) {
        return (*env)->NewStringUTF(env, "{\"status\":\"MissingModel\",\"text\":\"\",\"error\":\"null_result\"}");
    }
    jstring out = (*env)->NewStringUTF(env, json);
    salomon_free_string(json);
    return out;
}

JNIEXPORT jstring JNICALL
Java_ai_salomon_core_SalomonCore_nativeVersion(JNIEnv *env, jclass clazz) {
    (void)clazz;
    const char *v = salomon_version();
    return (*env)->NewStringUTF(env, v ? v : "");
}
