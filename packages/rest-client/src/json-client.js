/*
Copyright 2021-2023 TELENOR NORGE AS

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
limitations under the License.
*/

import axios from "axios";
import { v4 as uuid } from 'uuid';

export const DEFAULT_HOST = undefined;

export default function jsonClient(sso, api, token){
    const client = axios.create({
        baseURL: api,
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
    });

    client.interceptors.request.use(function (config) {
        config.headers.Authorization = "Bearer " + token;
        config.headers['X-Request-Id'] = uuid();
        return config;
    });

    client.interceptors.response.use(
        response => response,
        error => {
            console.log(error.response.status)
            if (error.response.status === 401) {
                console.log("redirect to /")
                window.location.href = '/';
            }
        }
    )

    return client;
}