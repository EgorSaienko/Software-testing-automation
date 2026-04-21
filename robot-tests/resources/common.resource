*** Settings ***
Documentation    Спільні змінні та ключові слова для всіх тестів блог-застосунку
Library          SeleniumLibrary

*** Variables ***
${BASE_URL}         http://localhost:3000
${BROWSER}          headlesschrome
${TEST_USERNAME}    robot_test_user
${TEST_EMAIL}       robot_test@example.com
${TEST_PASSWORD}    RobotPass123!
${DELAY}            0

*** Keywords ***
Open Browser To Home Page
    [Documentation]    Відкриває браузер та переходить на головну сторінку
    ${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys, selenium.webdriver
    Call Method    ${options}    add_argument    --no-sandbox
    Call Method    ${options}    add_argument    --disable-dev-shm-usage
    Call Method    ${options}    add_argument    --disable-gpu
    Open Browser    ${BASE_URL}    chrome    options=${options}
    Set Selenium Speed    ${DELAY}
    Maximize Browser Window

Flash Message Should Be Success
    [Documentation]    Перевіряє наявність зеленого flash-повідомлення
    Page Should Contain Element    css:.flash-success

Flash Message Should Be Error
    [Documentation]    Перевіряє наявність червоного flash-повідомлення
    Page Should Contain Element    css:.flash-error

URL Should Contain
    [Documentation]    Перевіряє що URL містить вказаний рядок
    [Arguments]    ${text}
    ${url}=    Get Location
    Should Contain    ${url}    ${text}
