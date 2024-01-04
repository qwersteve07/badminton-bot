from selenium import webdriver
from selenium.webdriver.common.by import By
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import time
import requests
import os
from dotenv import load_dotenv
load_dotenv()

driver = webdriver.Chrome()
driver.get('https://www.cjcf.com.tw/jj01.aspx?module=login_page&files=login&PT=1')

# clear alert
driver.switch_to.alert.accept()
driver.switch_to.alert.accept()
driver.find_element(By.CLASS_NAME,'swal2-confirm').click()

# fill the form
username = driver.find_element(By.ID,'ContentPlaceHolder1_loginid')
password = driver.find_element(By.ID,'loginpw')
username.send_keys(os.getenv('USERNAME'))
password.send_keys(os.getenv('PASSWORD'))

# login
time.sleep(1)
driver.execute_script("DoSubmit()")

# set cookies
cookies = driver.get_cookies()
session = requests.Session()
for cookie in cookies:
    session.cookies.set(cookie['name'], cookie['value'])

# wait until Friday
today = datetime.now().isoweekday()
while today != 5:
    today = datetime.now().isoweekday()

# pick space
def pickSpace(time):
    month = '01'
    date = '17'
    response = session.get(f"https://www.cjcf.com.tw/jj01.aspx?module=net_booking&files=booking_place&StepFlag=25&PT=1&D=2024/{month}/{date}&Qpid=1112&QTime={time}")

with ThreadPoolExecutor() as executor:
    executor.map(pickSpace, ['20','21'])


