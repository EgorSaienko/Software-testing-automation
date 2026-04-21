*** Settings ***
Documentation    Ключові слова для автентифікації
Library          SeleniumLibrary
Resource         common.resource

*** Keywords ***
Log In As
    [Documentation]    Виконує вхід у систему із заданими обліковими даними
    [Arguments]    ${email}    ${password}
    Go To    ${BASE_URL}/auth/login
    Input Text    id:email       ${email}
    Input Text    id:password    ${password}
    Click Button    css:button[type='submit']

Log Out
    [Documentation]    Виходить із системи через кнопку в шапці
    Click Button    css:.inline-form button[type='submit']
    Wait Until Location Contains    /auth/login    timeout=5s

Register User
    [Documentation]    Реєструє нового користувача
    [Arguments]    ${username}    ${email}    ${password}
    Go To    ${BASE_URL}/auth/register
    Input Text    id:username       ${username}
    Input Text    id:email          ${email}
    Input Text    id:password       ${password}
    Input Text    id:confirmPassword    ${password}
    Click Button    css:button[type='submit']
    Wait Until Location Contains    /posts    timeout=5s

Restore Password
    [Documentation]    Повертає пароль до попереднього значення (teardown)
    [Arguments]    ${current}    ${original}
    Go To    ${BASE_URL}/auth/change-password
    Input Text    id:currentPassword    ${current}
    Input Text    id:newPassword        ${original}
    Input Text    id:confirmPassword    ${original}
    Click Button    css:button[type='submit']
