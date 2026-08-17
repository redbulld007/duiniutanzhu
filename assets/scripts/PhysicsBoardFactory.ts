import { BoxCollider2D, CircleCollider2D, ERigidBody2DType, Node, RigidBody2D, Size, Vec2 } from 'cc';

/** Shared Box2D factory used by the pinball board. */
export class PhysicsBoardFactory {
  static circle(parent: Node, name: string, position: Vec2, radius: number, tag = 0, sensor = false): CircleCollider2D {
    const node = new Node(name);
    node.parent = parent;
    node.setPosition(position.x, position.y);
    const body = node.addComponent(RigidBody2D);
    body.type = ERigidBody2DType.Static;
    const collider = node.addComponent(CircleCollider2D);
    collider.radius = radius;
    collider.tag = tag;
    collider.sensor = sensor;
    collider.restitution = 0.86;
    collider.friction = 0.05;
    collider.apply();
    return collider;
  }

  static box(parent: Node, name: string, position: Vec2, size: Size, tag = 0, sensor = false): BoxCollider2D {
    const node = new Node(name);
    node.parent = parent;
    node.setPosition(position.x, position.y);
    const body = node.addComponent(RigidBody2D);
    body.type = ERigidBody2DType.Static;
    const collider = node.addComponent(BoxCollider2D);
    collider.size = size;
    collider.tag = tag;
    collider.sensor = sensor;
    collider.restitution = 0.86;
    collider.friction = 0.05;
    collider.apply();
    return collider;
  }
}
