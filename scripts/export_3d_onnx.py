import numpy as np
import onnx
from onnx import helper, TensorProto
import onnxruntime as ort
import json
import os

# 12 inputs -> 4 actions
# Inputs:
# 0..2: agent position (x, y, z)
# 3..5: target relative pos (dx, dy, dz)
# 6..9: obstacle distances (front, back, left, right)
# 10..11: linear & angular velocity
# Outputs:
# 0: MoveForward, 1: TurnLeft, 2: TurnRight, 3: Stop/Wait

input_dim = 12
output_dim = 4

W_3d = np.zeros((input_dim, output_dim), dtype=np.float32)
# If target is in front (dx > 0) -> MoveForward
W_3d[3, 0] = 2.0
# If target is to left (dy < 0) -> TurnLeft
W_3d[4, 1] = -2.0
# If target is to right (dy > 0) -> TurnRight
W_3d[4, 2] = 2.0
# If front obstacle distance is very small (near 0) -> penalty on MoveForward
W_3d[6, 0] = 3.0 # larger distance -> safe to move forward

B_3d = np.array([0.2, 0.1, 0.1, 0.05], dtype=np.float32)

X_3d = helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, input_dim])
Y_3d = helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, output_dim])

W_3d_init = helper.make_tensor('W', TensorProto.FLOAT, [input_dim, output_dim], W_3d.flatten().tolist())
B_3d_init = helper.make_tensor('B', TensorProto.FLOAT, [output_dim], B_3d.flatten().tolist())

matmul = helper.make_node('MatMul', ['input', 'W'], ['mm_out'])
add = helper.make_node('Add', ['mm_out', 'B'], ['add_out'])
softmax = helper.make_node('Softmax', ['add_out'], ['output'], axis=1)

graph_3d = helper.make_graph([matmul, add, softmax], 'Nav3DPolicy', [X_3d], [Y_3d], [W_3d_init, B_3d_init])
model_3d = helper.make_model(graph_3d, producer_name='alr-3d-lab', opset_imports=[helper.make_opsetid('', 14)])
model_3d.ir_version = 8

onnx_3d_path = "models/nav_3d_policy.onnx"
onnx.save(model_3d, onnx_3d_path)
print(f"Saved real 3D Navigation ONNX model to {onnx_3d_path} ({os.path.getsize(onnx_3d_path)} bytes)")

session_3d = ort.InferenceSession(onnx_3d_path)
test_in_3d = np.array([[0.0, 0.0, 0.0,  5.0, 0.0, 0.0,  10.0, 10.0, 10.0, 10.0,  0.0, 0.0]], dtype=np.float32)
res_3d = session_3d.run(['output'], {'input': test_in_3d})[0]
print("3D Nav ORT Output:", res_3d)

test_vector_3d = {
    "model_path": onnx_3d_path,
    "input": test_in_3d.flatten().tolist(),
    "expected_output": res_3d.flatten().tolist(),
    "best_class": int(np.argmax(res_3d)),
    "weights": W_3d.tolist(),
    "bias": B_3d.tolist()
}
with open("models/nav_3d_policy_test.json", "w") as f:
    json.dump(test_vector_3d, f, indent=2)

print("Saved 3D test vectors to models/nav_3d_policy_test.json")
