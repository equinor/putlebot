import numpy as np
import cv2, PIL
from cv2 import aruco
import matplotlib.pyplot as plt
import matplotlib as mpl
import pandas as pd
import math


frame = cv2.imread("../marker_images/markers.jpg")
plt.figure()
plt.imshow(frame)

gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_100)
parameters =  aruco.DetectorParameters_create()
corners, ids, rejectedImgPoints = aruco.detectMarkers(gray, aruco_dict, parameters=parameters)
df = pd.DataFrame(columns=['id', 'px', 'py', 'radian'])
for i in range(len(ids)-1, -1, -1):
    c = corners[i][0]
    px, py = c[:, 0].mean(), c[:, 1].mean()
    delta_y = c[1, 1] - c[0, 1]
    delta_x = c[1, 0] - c[0, 0]
    angleInRadian = math.atan2(delta_y, delta_x)
    print(type(ids[i][0]))
    df = df.append({'id': int(ids[i][0]), 'px': px, 'py': py, 'radian': angleInRadian}, ignore_index=True)
    
    print(angleInRadian)
    plt.plot([c[:, 0].mean()], [c[:, 1].mean()], "o", label = "id={0}".format(ids[i]))

df['id'] = df['id'].astype(np.int64)
print(df)
#plt.legend()
#plt.show()
